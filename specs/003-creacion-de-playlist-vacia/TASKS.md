# Tareas: 003-creacion-de-playlist-vacia

## 1. Metadatos

| Campo | Valor |
|---|---|
| Feature | `003-creacion-de-playlist-vacia` |
| Versión del plan de tareas | 0.1.3 |
| Fecha | 2026-10-10 |
| Replanificación aplicada | `DISC-002` clasificado `PLANNING_OMISSION` por `change-analyzer` (2026-10-09), sin `CR-XXX` y sin aprobación de alcance: aplicado en esta versión el ajuste de TASK-008 y TASK-014 y la precisión de TC-010 y TC-013 en `TEST_PLAN.md`. Quedan afectados y pendientes de precisión en su próxima revisión `ARCHITECTURE.md` §4.2, §5, §6.5, §6.7, §8 y §10 y las filas afectadas de `TRACEABILITY.md`, que no se modifican en esta sesión |
| Replanificación aplicada (DISC-003) | `DISC-003` clasificado `PLANNING_OMISSION` por `change-analyzer` (análisis `ses_eda7c46fbffehONm6SLvxkyIIF`, 2026-10-10), sin `CR-XXX` y sin cambio de alcance: se precisa TASK-020 §RNF-004 con `@vitest/coverage-v8` como proveedor implícito de RNF-005 ya configurado en `vitest.config.ts` y se actualiza `TEST_PLAN.md` (TC-028 y §8/§10). RNF-005, el umbral del 80 % y el resto de tareas quedan intactos |
| Replanificación aplicada (DISC-004 / CR-001) | `DISC-004` clasificado `SCOPE_CHANGE` por `change-analyzer` (análisis vinculante `ses_eda659a8fffe41u9Q81OIfhly8`, 2026-10-10) y aprobado por aprobación humana explícita el 2026-10-10 08:51: la medición de cobertura se re-acota al alcance 003 (`src/business/playlists/**` + `src/business/retry/**`) manteniendo el umbral del 80 %. En esta versión 0.1.3 se precisa TASK-020 §RNF-005 y se alinean TC-028, §10 y §12 de `TEST_PLAN.md`; el umbral, el resto de tareas y los requisitos, criterios y arquitectura aprobados quedan intactos. Detalle en `CHANGE_REQUESTS.md` (`CR-001`); el ajuste de `vitest.config.ts` queda pendiente de ejecución |
| Estado inicial de todas las tareas | `PENDING` |
| Base funcional aprobada | `SPECS.md` 0.2.0, `REQUIREMENTS.md` 0.2.0 (RF-001, RF-002, RNF-001 a RNF-006), `USE_CASES.md` 0.2.0 (UC-001, A1, E1-E3), `ACCEPTANCE_CRITERIA.feature` 0.2.0 (AC-001 a AC-005 ejecutables) |
| Base arquitectónica válida | `ARCHITECTURE.md` 0.1.0 (§3 entradas, §4 capas, §5 puertos `SesionProveedor`/`PlaylistGateway`/`RegistroTecnico`/`Espera`, §6 flujos, ADR-001, ADR-002); su precisión de §4.2, §5, §6.5, §6.7, §8 y §10 para `DISC-002` sigue pendiente de aplicar |
| Revisión | `SPEC_REVIEW.md` 0.2.0 `PASS_WITH_NOTES` más addendum de coherencia 0.2.0 ↔ 0.1.0 `PASS_WITH_NOTES` |
| Gate de entrada | `SPEC_READY` declarable (revisión aprobatoria más aprobación humana dada); acto formal de declaración en `STATE.md` fuera de este alcance |
| Gate objetivo de este documento | `IMPLEMENTATION_READY` |

## 2. Alcance de esta entrega

Incluido:

1. Este `TASKS.md` con tareas `TASK-XXX` verificables, dependencias, orden y trazabilidad `OBJ → RF/RNF → UC → AC → TASK`.
2. `TEST_PLAN.md` con los casos `TC-XXX` asociados a cada tarea.

Excluido explícitamente:

- Crear código, ficheros de prueba o pruebas reales.
- Declarar `FEATURE_DONE` o ejecutar la implementación.
- Modificar `SPECS.md`, `REQUIREMENTS.md`, `USE_CASES.md`, `ACCEPTANCE_CRITERIA.feature`, `STATE.md` ni `SPEC_REVIEW.md`.

Alcance de la replanificación `DISC-002` (2026-10-09), dentro de la regla de mínimo cambio: se ajustan únicamente TASK-008 y TASK-014 de este documento y TC-010 y TC-013 de `TEST_PLAN.md`. `ARCHITECTURE.md` (§4.2, §5, §6.5, §6.7, §8 y §10) y las filas afectadas de `TRACEABILITY.md` quedan señalados como afectados pero sin modificar en esta sesión, de modo que su precisión sigue pendiente conforme a `IMPACT_ANALYSIS.md`. No se crea `CR-XXX`, no se reabren TASK-001 a TASK-007 y no se modifica especificación, criterios ni código.

## 3. Orden de planificación por capas

El orden solicitado se respeta: **Data (gateway y retry) → Business (caso de uso, validación, duplicados y errores) → Presentation (comando, menú 4, prompts, confirmaciones y reingresos) → integración E2E**.

| Grupo | Tareas | Capa principal | Justificación del orden |
|---|---|---|---|
| A | TASK-001 a TASK-004 | Contratos + Data + retry | El gateway, el registro Pino y la política de reintento son los efectos que Business consume; ADR-002 exige que Business defina los puertos que Data implementa, por eso TASK-001 abre el grupo sin invertir la dirección de dependencias. |
| B | TASK-005 a TASK-009 | Business | Reglas puras (validación, duplicados, clasificación) antes que el caso de uso que las orquesta; los reintentos 429 se integran al final del grupo. |
| C | TASK-010 a TASK-016 | Presentation | Punto de entrada sin efectos secundarios, literales, prompts, composición de dependencias, coordinador de flujo, comando directo y opción 4 del menú. |
| D | TASK-017 a TASK-021 | Integración E2E y cierre | Arnés de extremo a extremo, suites de aceptación AC-001 a AC-005, verificación transversal de RNF y evidencia documental. |

## 4. Reglas de ejecución de cada tarea

- `NO TEST → NO IMPLEMENTATION`: para toda tarea de comportamiento se ejecuta `RED → GREEN → REFACTOR` y la evidencia se registra en `TDD_LOG.md`.
- TDD por tarea: primero la prueba prevista que debe fallar, después la implementación mínima que la pone en verde y finalmente la refactorización sin cambiar comportamiento.
- TypeScript en modo estricto, ESM, Vitest y Biome sin errores; complejidad cognitiva menor de 15 por función; sin `any` explícito ni implícito.
- Respeto de capas `Presentation → Business → Data`: Business sin `console.log`, sin `process.argv`, sin `process.exit`, sin `fetch`, sin sistema de ficheros y sin Pino directo (usa los puertos); Data sin mensajes de usuario ni reglas de negocio; Presentation sin reglas críticas.
- Mensajes, peticiones y menús en español estricto con los literales exactos aprobados (RNF-002), conservando sin traducir identificadores técnicos, rutas y cabeceras como `Retry-After`.
- Sin dependencias nuevas: solo la base transversal declarada (Node.js 22 o superior, TypeScript, ESM, Biome, Vitest, Pino, SDK de Spotify y `msw` ya presente en `devDependencies`).
- Registro técnico con Pino en `data/app.log` sin tokens, secretos ni cuerpos sensibles (RNF-001, RNF-006); en pruebas se aísla con `SPOTY_LOG_FILE` y `SPOTY_TOKENS_FILE`.
- Compatibilidad con empaquetado futuro como binario único vía Node.js SEA (RNF-004): sin binarios nativos, sin carga dinámica y sin requisitos de ejecución nuevos.
- Reutilización por clientes no CLI (RNF-003): el caso de uso se invoca con una solicitud y dependencias inyectadas, nunca con `argv` ni `readline`.
- Ante cualquier vacío que afecte al comportamiento: registrar `DISC-XXX` y devolver el control al orquestador; no modificar artefactos aprobados.

---

## 5. Tareas

### TASK-001: Contratos de dominio y puertos de la feature

- **Tipo**: code
- **Estado**: DONE (TC-001 en verde; evidencia RED → GREEN → REFACTOR en `TDD_LOG.md` § TASK-001)
- **Requisitos**: RF-001, RF-002, RNF-003, RNF-005
- **Casos de uso**: UC-001
- **Criterios**: AC-001, AC-002, AC-003, AC-004, AC-005
- **Dependencias**: —
- **Archivos previstos**: `src/business/playlists/types.ts`, `src/business/playlists/puertos.ts` (nombres orientativos según `ARCHITECTURE.md` §4.2 y §5)
- **Resultado verificable**: existen y compilan en modo estricto la solicitud (`nombre` en bruto, `descripción` opcional, `visibilidad` de dos valores sin modalidad colaborativa), la descripción efectiva, el resultado de creación como unión discriminada con los desenlaces `Exito` (con identificador y enlace), `ErrorValidacion`, `Duplicado`, `SinSesion`, `SesionCaducada`, `PermisosInsuficientes`, `LimiteAgotado`, `FalloInesperado` y `Cancelado`, más los cuatro puertos de §5: `SesionProveedor.obtenerSesionVigente()`, `PlaylistGateway.crearPlaylist(entrada)` y `PlaylistGateway.listarPlaylistsPropias()`, `RegistroTecnico.info/advertencia/error` y `Espera.esperar(milisegundos)`. Sin `any`, sin importaciones de Presentation, CLI, Pino, `fetch` ni sistema de ficheros.
- **Prueba prevista**: TC-001
- **Criterio de finalización**: TC-001 en verde; `tsc --noEmit` sin errores; Biome sin errores; el módulo no importa de `src/presentation/`, de `src/cli.ts` ni de `src/data/`.
- **Trazabilidad**: `OBJ-001 → RF-001, RF-002, RNF-003 → UC-001 → AC-001, AC-002, AC-003, AC-004, AC-005 → TASK-001 → TC-001`
- **TDD previsto**: RED: TC-001 falla porque el módulo de tipos no existe; GREEN: crear los tipos y puertos mínimos; REFACTOR: agrupar nombres sin alterar la forma de los desenlaces.

### TASK-002: Data — `PlaylistGateway` con crear y listar propias paginadas

- **Tipo**: code
- **Estado**: DONE (TC-002, TC-003 en verde; evidencia RED → GREEN → REFACTOR en `TDD_LOG.md` § TASK-002)
- **Requisitos**: RF-001, RNF-001, RNF-003, RNF-005
- **Casos de uso**: UC-001 (principal), UC-001-A1, UC-001-E2, UC-001-E3
- **Criterios**: AC-001, AC-004, AC-005
- **Dependencias**: TASK-001
- **Archivos previstos**: `src/data/http/playlists-client.ts` sobre `src/data/http/spotify-client.ts` (orientativo, `ARCHITECTURE.md` §4.3)
- **Resultado verificable**: implementación del puerto `PlaylistGateway` sin red real en pruebas:
  - `crearPlaylist` envía nombre efectivo, descripción efectiva, visibilidad y testigo de sesión; nunca marca colaborativa; devuelve identificador y enlace de Spotify.
  - `listarPlaylistsPropias()` pagina hasta agotar resultados y devuelve solo las listas del usuario vigente (acceso a la sesión encapsulado en Data, `ARCHITECTURE.md` §4.3).
  - Las respuestas HTTP se traducen a errores tipados con `estado` (`401`, `403`, `429` con `reintentoTras` leído de la cabecera `Retry-After` en segundos, o genérico con `causa` depurada), sin componer mensajes de usuario y sin dejar cuerpos de respuesta en la causa.
- **Prueba prevista**: TC-002, TC-003
- **Criterio de finalización**: TC-002 y TC-003 en verde con el punto de inyección de `fetch` o con `msw`, sin navegación real; Biome y `tsc` en verde; el módulo no importa de Business ni de Presentation.
- **Trazabilidad**: `OBJ-001 → RF-001, RNF-001 → UC-001 → AC-001, AC-004, AC-005 → TASK-002 → TC-002, TC-003`
- **TDD previsto**: RED: TC-002 y TC-003 fallan por módulo inexistente; GREEN: implementar crear, paginar y mapear códigos; REFACTOR: extraer la lectura de `Retry-After` y el filtrado por propietario sin cambiar resultados.

### TASK-003: Data — puerto `RegistroTecnico` sobre Pino en `data/app.log`

- **Tipo**: code
- **Estado**: DONE (TC-004 en verde; evidencia RED → GREEN → REFACTOR en `TDD_LOG.md` § TASK-003)
- **Requisitos**: RNF-001, RNF-003, RNF-005, RNF-006
- **Casos de uso**: UC-001
- **Criterios**: AC-001, AC-004, AC-005
- **Dependencias**: TASK-001
- **Archivos previstos**: `src/data/logging/registro-tecnico.ts` sobre `src/data/logging/pino-setup.ts` y `src/data/storage/log-file.ts` (orientativo)
- **Resultado verificable**: implementación del puerto `RegistroTecnico` con `info`, `advertencia` y `error` sobre Pino hacia `data/app.log` (o hacia `SPOTY_LOG_FILE` en pruebas), que admite los campos estructurados previstos (nombre efectivo, visibilidad, descripción efectiva, identificador, intento, estado, causa depurada) y depura antes de escribir cualquier testigo, secreto, cabecera de autorización o cuerpo de respuesta. No emite eventos por sí mismo: solo escribe lo que Business indique.
- **Prueba prevista**: TC-004
- **Criterio de finalización**: TC-004 en verde con fichero de registro temporal; búsqueda de patrones de token sin coincidencias; Biome y `tsc` en verde.
- **Trazabilidad**: `OBJ-001 → RNF-001, RNF-006 → UC-001 → AC-001, AC-004, AC-005 → TASK-003 → TC-004`
- **TDD previsto**: RED: TC-004 falla porque el puerto no existe; GREEN: escribir niveles y campos exigidos con depuración mínima; REFACTOR: centralizar la lista de campos depurados sin cambiar la salida.

### TASK-004: Política de reintento ante 429 parametrizable (ADR-001)

- **Tipo**: code
- **Estado**: DONE (TC-005, TC-006 en verde; evidencia RED → GREEN → REFACTOR en `TDD_LOG.md` § TASK-004)
- **Requisitos**: RF-002, RNF-005, RNF-006
- **Casos de uso**: UC-001-E2
- **Criterios**: AC-004
- **Dependencias**: TASK-001, TASK-003
- **Archivos previstos**: `src/business/retry/retry.ts` (parametrización) y `src/business/playlists/politica-reintento.ts` (orientativo)
- **Resultado verificable**:
  - `withRetry` acepta inyectables `Espera` y `RegistroTecnico` y una política de error tipada, conservando por defecto el comportamiento actual de autenticación (2 reintentos, retroceso exponencial, `(retryAfter + 1) * 1000`, sin reintento de errores no transitorios ni de errores que no son de autenticación).
  - Nueva política propia de esta feature según ADR-001: `maxRetries = 3` (3 reintentos, hasta 4 intentos totales), `getDelay` que devuelve `reintentoTras * 1000` cuando el dato de `Retry-After` es mayor que 0 y `10000` en su ausencia, sin temporizadores propios: la espera siempre se ejecuta a través del puerto `Espera`.
  - Cada reintento emite `advertencia` con intento y estado a través de `RegistroTecnico`.
- **Prueba prevista**: TC-005, TC-006
- **Criterio de finalización**: TC-005 (regresión del flujo de autenticación sin modificar aserciones existentes) y TC-006 en verde; ninguna espera real en pruebas; Biome y `tsc` en verde.
- **Trazabilidad**: `OBJ-001 → RF-002, RNF-006 → UC-001-E2 → AC-004 → TASK-004 → TC-005, TC-006`
- **TDD previsto**: RED: TC-006 falla porque la política de playlists no existe; GREEN: parametrizar `withRetry` con los inyectables y añadir la política de 3 intentos; REFACTOR: eliminar duplicación de espera sin que cambie TC-005.

### TASK-005: Business — predicados puros de validación de nombre, descripción y visibilidad

- **Tipo**: code
- **Estado**: DONE (TC-007 en verde; evidencia RED → GREEN → REFACTOR en `TDD_LOG.md` § TASK-005)
- **Requisitos**: RF-001, RNF-005
- **Casos de uso**: UC-001 (principal), UC-001-E3
- **Criterios**: AC-002, AC-005
- **Dependencias**: TASK-001
- **Archivos previstos**: `src/business/playlists/validacion.ts` (orientativo, `ARCHITECTURE.md` §4.2)
- **Resultado verificable**: funciones puras sin efectos secundarios que:
  - recortan espacios en extremos y miden caracteres visibles;
  - aceptan longitudes de 3 a 100 y rechazan vacío, solo espacios y longitud fuera de rango (nombre ausente en comando directo equivale a cadena vacía);
  - resuelven la descripción efectiva: valor aportado no vacío o `"Playlist sin descripción"` cuando la descripción es vacía o solo espacios (definición general de vacío de P-004);
  - resuelven la visibilidad obligatoria y excluyente: un único indicador `--public` o `--private` es válido; la ausencia o la doble presencia produce `ErrorValidacion` de visibilidad; la modalidad colaborativa no es representable.
- **Prueba prevista**: TC-007
- **Criterio de finalización**: TC-007 en verde; funciones con complejidad cognitiva menor de 15; sin acceso a red, disco ni terminal.
- **Trazabilidad**: `OBJ-001 → RF-001 → UC-001, UC-001-E3 → AC-002, AC-005 → TASK-005 → TC-007`
- **TDD previsto**: RED: TC-007 falla porque los predicados no existen; GREEN: implementar los cuatro predicados mínimos; REFACTOR: unificar el recorte en una sola función sin cambiar resultados.

### TASK-006: Business — predicado de duplicado contra listas propias

- **Tipo**: code
- **Estado**: DONE (TC-008 en verde; evidencia RED → GREEN → REFACTOR en `TDD_LOG.md` § TASK-006)
- **Requisitos**: RF-001, RNF-005
- **Casos de uso**: UC-001-A1
- **Criterios**: AC-005
- **Dependencias**: TASK-001
- **Archivos previstos**: `src/business/playlists/validacion.ts`
- **Resultado verificable**: `esDuplicadoPropio(nombreEfectivo, propias)` devuelve coincidencia únicamente cuando, tras recortar espacios en extremos, los nombres son exactamente iguales y sensibles a mayúsculas (`Viaje 2026 ` coincide con `Viaje 2026`; `Viaje` no coincide con `viaje`); las listas ajenas homónimas no cuentan porque el predicado solo recibe las listas propias ya filtradas por Data. Función pura sin acceso a red ni disco.
- **Prueba prevista**: TC-008
- **Criterio de finalización**: TC-008 en verde; Biome y `tsc` en verde.
- **Trazabilidad**: `OBJ-001 → RF-001 → UC-001-A1 → AC-005 → TASK-006 → TC-008`
- **TDD previsto**: RED: TC-008 falla porque el predicado no existe; GREEN: implementar la comparación exacta tras recorte; REFACTOR: sin cambios de comportamiento.

### TASK-007: Business — clasificación de errores de Data en resultados de dominio

- **Tipo**: code
- **Estado**: DONE (TC-009 en verde; evidencia RED → GREEN → REFACTOR en `TDD_LOG.md` § TASK-007)
- **Requisitos**: RF-002, RNF-001, RNF-005
- **Casos de uso**: UC-001-E1, UC-001-E2
- **Criterios**: AC-004
- **Dependencias**: TASK-001, TASK-002
- **Archivos previstos**: `src/business/playlists/errores.ts` (orientativo)
- **Resultado verificable**: función pura de clasificación que transforma el error tipado de Data en el resultado de dominio correspondiente: `401 → SesionCaducada`, `403 → PermisosInsuficientes`, `429` persistente tras agotar reintentos → `LimiteAgotado`, resto → `FalloInesperado` con causa depurada (sin cuerpos de respuesta, sin cabeceras y sin testigos). No compone mensajes de usuario: los literales los elige Presentation.
- **Prueba prevista**: TC-009
- **Criterio de finalización**: TC-009 en verde; ninguna rama introduce mensajes en español ni acceso a efectos secundarios.
- **Trazabilidad**: `OBJ-001 → RF-002, RNF-001 → UC-001-E2 → AC-004 → TASK-007 → TC-009`
- **TDD previsto**: RED: TC-009 falla porque la clasificación no existe; GREEN: implementar el mapeo de los cuatro casos; REFACTOR: extraer la depuración de la causa sin cambiar resultados.

### TASK-008: Business — caso de uso `crearPlaylistVacia` (sesión, validación, duplicados, confirmación y éxito)

- **Tipo**: code
- **Estado**: DONE (TC-010, TC-011, TC-012, TC-013 en verde; evidencia RED → GREEN → REFACTOR en `TDD_LOG.md` § TASK-008)
- **Requisitos**: RF-001, RF-002, RNF-001, RNF-003, RNF-005, RNF-006
- **Casos de uso**: UC-001 (principal), UC-001-A1, UC-001-E1, UC-001-E3
- **Criterios**: AC-001, AC-004, AC-005
- **Dependencias**: TASK-001, TASK-002, TASK-003, TASK-005, TASK-006
- **Archivos previstos**: `src/business/playlists/crear-playlist.ts` (orientativo, `ARCHITECTURE.md` §4.2) más la ampliación de `src/business/playlists/types.ts` (`SolicitudCreacion`) exigida por `DISC-002`. La ampliación se hace en esta tarea sin reabrir TASK-001: los campos `nombre`, `descripcion` y `visibilidad`, la unión de 9 desenlaces y los cuatro puertos de `src/business/playlists/puertos.ts` (`DependenciasCreacion`) permanecen intactos, de modo que TC-001 sigue en verde.
- **Canal de confirmación y duplicado aceptado (`DISC-002`)**: la solicitud incorpora dos miembros de estado de flujo de la invocación:
  - `canalConfirmacion`, operación inyectada por Presentation que devuelve `confirmada` o `cancelada`. Se invoca dentro del caso de uso, después de la validación y de los duplicados y antes de crear, porque el orden aprobado (UC-001 paso 4 → paso 5 y AC-005 «opción 2 → continúa hacia la confirmación final») exige solicitarla a mitad de flujo: no puede conocerse antes de invocar ni residir en un quinto puerto permanente sin reabrir TC-001. En comando directo válido sin reingreso, Presentation lo inyecta pre-resuelto en `confirmada` (P-001, N-001); en todo flujo interactivo implementa la petición `(s/N): ` y devuelve `cancelada` ante `N`, otra respuesta o `Ctrl+C`.
  - `duplicadoAceptado` (opcional), señal de que el usuario eligió la opción 2 del menú de duplicados; cierra la reinvocación de UC-001-A1 paso 4/5 y `ARCHITECTURE.md` §6.5 sin bucle.
  - Justificación arquitectónica: la decisión de confirmación y la aceptación del duplicado son estado de una invocación concreta, no una capacidad permanente del sistema; por eso viajan en la solicitud y no como quinto puerto de `DependenciasCreacion`. Business sigue sin `argv`, sin `readline`, sin terminal y sin Pino: invoca el canal inyectado igual que invoca los puertos (RNF-003, RNF-004).
- **Resultado verificable**: función reutilizable `crearPlaylistVacia(solicitud, dependencias)` que recibe la solicitud (con `canalConfirmacion` y `duplicadoAceptado`) y los cuatro puertos `SesionProveedor`, `PlaylistGateway`, `RegistroTecnico` y `Espera`, sin `argv`, sin `readline` y sin importar Presentation ni CLI, y que produce el flujo ordenado sesión → validación → listado/duplicados → confirmación → `info` de inicio → creación → `info` de éxito:
  - `SinSesion` sin invocar el gateway cuando `SesionProveedor` no devuelve sesión vigente (BR-001), antes de invocar el canal;
  - `ErrorValidacion` de longitud o de visibilidad sin listar ni crear mientras la entrada siga inválida, antes de invocar el canal (BR-004, BR-005);
  - listado de propias solo cuando el nombre es sintácticamente válido, y `Duplicado` con el nombre efectivo más `advertencia` con el nombre cuando procede, sin invocar todavía el canal (BR-006);
  - con `duplicadoAceptado: true`, omisión de la comprobación de duplicados ya resuelta por el usuario, sin repetir la `advertencia`, continuando directamente a la confirmación (UC-001-A1 paso 4/5);
  - invocación del `canalConfirmacion` únicamente después de superar validación y duplicados: si devuelve `cancelada`, resultado `Cancelado` sin invocar creación y sin emitir ningún registro (BR-007); si devuelve `confirmada`, emisión del `info` de inicio —ya no hay posibilidad de cancelación— y ordenación de la creación (RNF-006);
  - `Exito` con identificador y enlace tras crear, con `info` de éxito con nombre, visibilidad, descripción efectiva e identificador (RNF-006).
- **Prueba prevista**: TC-010, TC-011, TC-012, TC-013
- **Criterio de finalización**: TC-010, TC-011, TC-012 y TC-013 en verde con dobles de los cuatro puertos y del canal de confirmación; ninguna función supera complejidad cognitiva 15; sin `any`; Business sigue sin importar Pino, ficheros, red ni terminal; TC-001 permanece en verde sin modificar sus aserciones.
- **Trazabilidad**: `DISC-002 → OBJ-001 → RF-001, RF-002, RNF-006 → UC-001, UC-001-A1, UC-001-E1, UC-001-E3 → AC-001, AC-004, AC-005 → TASK-008 → TC-010, TC-011, TC-012, TC-013`
- **TDD previsto**: RED: TC-010 a TC-013 fallan porque el caso de uso no existe (TC-010 y TC-013 además fijan el canal y el `Cancelado` ahora escribibles); GREEN: ampliar `SolicitudCreacion` y orquestar sesión, validación, listado, duplicado, canal de confirmación y creación; REFACTOR: descomponer en funciones pequeñas manteniendo los cuatro resultados verdes.

### TASK-009: Business — integración de reintentos 429 y errores de servicio en el caso de uso

- **Tipo**: code
- **Estado**: DONE (TC-014, TC-015 en verde; evidencia RED → GREEN → REFACTOR en `TDD_LOG.md` § TASK-009)
- **Requisitos**: RF-002, RNF-001, RNF-005, RNF-006
- **Casos de uso**: UC-001-E2
- **Criterios**: AC-004
- **Dependencias**: TASK-004, TASK-007, TASK-008
- **Archivos previstos**: `src/business/playlists/crear-playlist.ts` (extensión)
- **Resultado verificable**: la ordenación de creación se ejecuta bajo la política de reintento de TASK-004 con `Espera` y `RegistroTecnico` inyectados:
  - ante `429` se reintentan hasta 3 veces esperando `Retry-After` segundos cuando Data lo aporta y 10 segundos en su ausencia, emitiendo `advertencia` con intento y estado en cada reintento, y devolviendo `LimiteAgotado` con `error` final de causa depurada cuando persiste;
  - `401 → SesionCaducada`, `403 → PermisosInsuficientes` y fallo genérico → `FalloInesperado`, cada uno con `error` final de causa depurada y sin reintentos indebidos;
  - ningún registro contiene testigos, cabeceras de autorización ni cuerpos de respuesta.
- **Prueba prevista**: TC-014, TC-015
- **Criterio de finalización**: TC-014 y TC-015 en verde sin temporizadores reales; recuento de llamadas al gateway coincide con 4 intentos como máximo en el caso 429; Biome y `tsc` en verde.
- **Trazabilidad**: `OBJ-001 → RF-002, RNF-001, RNF-006 → UC-001-E2 → AC-004 → TASK-009 → TC-014, TC-015`
- **TDD previsto**: RED: TC-014 y TC-015 fallan porque el caso de uso aún no clasifica errores de servicio; GREEN: envolver la creación con la política y clasificar el resultado; REFACTOR: separar la envoltura de reintentos de la clasificación sin cambiar resultados.

### TASK-010: Presentation — punto de entrada sin efectos secundarios

- **Tipo**: code
- **Estado**: DONE (TC-016 en verde; evidencia RED → GREEN → REFACTOR en `TDD_LOG.md` § TASK-010)
- **Requisitos**: RNF-003, RNF-004, RNF-005
- **Casos de uso**: UC-001 (ambos disparadores)
- **Criterios**: AC-002, AC-003
- **Dependencias**: —
- **Archivos previstos**: `src/cli-main.ts` (orientativo) y `src/cli.ts` reducido a arranque
- **Resultado verificable**: la lógica de `src/cli.ts` (`main`, `handleCommand`, `runInteractiveMode`, `showHelp`) pasa a un módulo importable sin ejecutar nada al importarlo; `src/cli.ts` conserva exclusivamente el arranque y los códigos de salida actuales, de modo que el binario `spoty` (`package.json` `bin`) y el modo interactivo siguen comportándose igual. Esto es lo que permite probar AC-002 y AC-003 sin que las pruebas sufran `process.exit`.
- **Prueba prevista**: TC-016
- **Criterio de finalización**: TC-016 en verde; ningún comportamiento observable del CLI cambia; el arranque sigue siendo compatible con el empaquetado SEA.
- **Trazabilidad**: `OBJ-001 → RNF-003, RNF-004 → UC-001 → AC-002, AC-003 → TASK-010 → TC-016`
- **TDD previsto**: RED: TC-016 falla porque al importar el módulo se ejecuta el arranque; GREEN: extraer funciones exportadas y dejar `cli.ts` como arranque; REFACTOR: ordenar imports y eliminar duplicación sin cambiar comportamiento.

### TASK-011: Presentation — literales exactos aprobados

- **Tipo**: code
- **Estado**: DONE (TC-017 en verde; evidencia RED → GREEN → REFACTOR en `TDD_LOG.md` § TASK-011)
- **Requisitos**: RF-002, RNF-002, RNF-005
- **Casos de uso**: UC-001 (principal), UC-001-A1, UC-001-E1, UC-001-E2, UC-001-E3
- **Criterios**: AC-001, AC-002, AC-003, AC-004, AC-005
- **Dependencias**: —
- **Archivos previstos**: `src/presentation/messages.ts` (extensión sin alterar literales existentes)
- **Resultado verificable**: constantes nuevas con carácter a carácter los literales aprobados: éxito `Playlist creada: "X" (pública/privada, descripción: "...", id: ..., enlace: ...)` como plantilla con nombre, visibilidad (`pública` o `privada`), descripción efectiva, identificador y enlace; `Error en longitud del nombre de la playlist, mínimo 3, máximo 100 caracteres totales.`; `Se debe declarar flag único en comando --public o --private`; `No hay sesión activa. Conecta con Spotify con la opción 1`; `Sesión caducada. Vuelve a conectar con Spotify.`; `Permisos insuficientes para crear la playlist.`; `Vuelva a intentarlo más tarde` (sin punto final); `No se pudo crear la playlist por un error inesperado.`; `Ya existe una playlist llamada "X".`; el menú de duplicados `¿Qué deseas hacer? 1. Modificar nombre 2. Crear de todos modos con el mismo nombre 0. Cancelar sin crear / Elige (0-2):`; `Creación cancelada. No se creó ninguna playlist.`; peticiones `Nombre de la playlist (3-100 caracteres):` y `Descripción (opcional, Enter para usar "Playlist sin descripción"):`; pregunta `¿Deseas modificar descripción y visibilidad? (s/N): `; ítem `4. Crear playlist vacía` y ayuda `(navega con 0-4,9, Ctrl+C para cancelar)`.
- **Prueba prevista**: TC-017
- **Criterio de finalización**: TC-017 en verde; los literales preexistentes de `MESSAGES` no cambian; Biome y `tsc` en verde.
- **Trazabilidad**: `OBJ-001 → RF-002, RNF-002 → UC-001 → AC-001, AC-002, AC-003, AC-004, AC-005 → TASK-011 → TC-017`
- **TDD previsto**: RED: TC-017 falla porque los literales nuevos no existen; GREEN: añadir las constantes; REFACTOR: agrupar por sección sin alterar ningún valor.

### TASK-012: Presentation — peticiones, confirmaciones y elecciones

- **Tipo**: code
- **Estado**: DONE (TC-018 en verde; evidencia RED → GREEN → REFACTOR en `TDD_LOG.md` § TASK-012)
- **Requisitos**: RF-001, RF-002, RNF-002, RNF-005
- **Casos de uso**: UC-001 (principal), UC-001-A1, UC-001-E3
- **Criterios**: AC-002, AC-003, AC-005
- **Dependencias**: TASK-011
- **Archivos previstos**: `src/presentation/prompts.ts` (extensión sobre `prompt`, `confirmExit` y `promptMenuChoice`)
- **Resultado verificable**: peticiones literales de nombre y descripción, lista de visibilidad con la opción pública preseleccionada (equivalente a `--public`), confirmación final con el formato `(s/N): ` donde solo la respuesta `s` (en minúscula) confirma, elección del menú de duplicados aceptando únicamente `0`, `1` y `2`, pregunta `¿Deseas modificar descripción y visibilidad? (s/N): `, y manejo de `Ctrl+C` durante cualquier petición que aborta la creación sin crear ni registrar. La lógica de interpretación de la respuesta se separa en funciones puras probables; la entrada se sustituye en pruebas por un doble de `readline`.
- **Prueba prevista**: TC-018
- **Criterio de finalización**: TC-018 en verde con entrada simulada y sin teclado real; `Enter` en descripción produce el valor por defecto; Biome y `tsc` en verde.
- **Trazabilidad**: `OBJ-001 → RF-001, RF-002, RNF-002 → UC-001, UC-001-A1 → AC-002, AC-003, AC-005 → TASK-012 → TC-018`
- **TDD previsto**: RED: TC-018 falla porque las funciones de interpretación no existen; GREEN: implementar interpretación y peticiones mínimas; REFACTOR: separar interpretación de lectura sin cambiar respuestas observables.

### TASK-013: Presentation — composición de dependencias reales

- **Tipo**: integration
- **Estado**: DONE (TC-019 en verde; evidencia RED → GREEN → REFACTOR en `TDD_LOG.md` § TASK-013)
- **Requisitos**: RF-001, RNF-001, RNF-003, RNF-005, RNF-006
- **Casos de uso**: UC-001 (principal), UC-001-E1
- **Criterios**: AC-001, AC-004
- **Dependencias**: TASK-002, TASK-003, TASK-004, TASK-008, TASK-009
- **Archivos previstos**: composición de arranque en Presentation (orientativa)
- **Resultado verificable**: existe una única función de composición que construye el caso de uso con `SesionProveedor` sobre `getStoredTokens`/`checkExistingSession`, `PlaylistGateway` real, `RegistroTecnico` real hacia `data/app.log` y `Espera` real de temporizador, y que la usan tanto el comando directo como la opción 4. La composición no cambia la conexión: `REQUIRED_SCOPES` ya contiene `playlist-modify-public` y `playlist-modify-private` y no se modifica. Sin red real ni escritura en `data/` real durante las pruebas (aislamiento por `SPOTY_LOG_FILE` y `SPOTY_TOKENS_FILE`).
- **Prueba prevista**: TC-019
- **Criterio de finalización**: TC-019 en verde; la composición produce un caso de uso operable que devuelve éxito con dobles de red y ficheros temporales; ninguna capa queda invertida (revisión de imports).
- **Trazabilidad**: `OBJ-001 → RF-001, RNF-003, RNF-006 → UC-001 → AC-001, AC-004 → TASK-013 → TC-019`
- **TDD previsto**: RED: TC-019 falla porque la composición no existe; GREEN: cablear los cuatro puertos reales; REFACTOR: eliminar duplicación entre ambos puntos de entrada sin cambiar resultados.

### TASK-014: Presentation — coordinador del flujo de creación (reingresos, duplicados y confirmación)

- **Tipo**: code
- **Estado**: DONE (TC-020 en verde; evidencia RED → GREEN → REFACTOR en `TDD_LOG.md` § TASK-014)
- **Requisitos**: RF-001, RF-002, RNF-002, RNF-003, RNF-005
- **Casos de uso**: UC-001 (principal), UC-001-A1, UC-001-E1, UC-001-E2, UC-001-E3
- **Criterios**: AC-001, AC-003, AC-004, AC-005
- **Dependencias**: TASK-008, TASK-009, TASK-011, TASK-012
- **Archivos previstos**: `src/presentation/crear-playlist.ts` (orientativo, fuera de la lista exhaustiva de `ARCHITECTURE.md` §4.1 cuyos nombres son orientativos)
- **Resultado verificable**: adaptador delgado, con el caso de uso y las peticiones inyectadas, que:
  - construye la solicitud con el estado de flujo exigido por `DISC-002`: `canalConfirmacion` pre-resuelto en `confirmada` cuando el disparador de comando directo aporta todos los parámetros válidos sin reingreso (P-001, N-001, encargado de TASK-015), y `canalConfirmacion` con la petición de confirmación inyectada en cualquier flujo interactivo (opción 4, reingreso y reinvocaciones); `duplicadoAceptado` solo cuando proceda; el coordinador no decide reglas, solo suministra el canal;
  - presenta el resultado `Exito` con el mensaje único de éxito y cada mensaje exacto de error según el desenlace devuelto por Business, sin decidir reglas;
  - gestiona el reingreso: `ErrorValidacion` de longitud muestra `Error en longitud del nombre de la playlist, mínimo 3, máximo 100 caracteres totales.` y repite la petición de nombre; `ErrorValidacion` de visibilidad muestra `Se debe declarar flag único en comando --public o --private`;
  - gestiona `Duplicado`: muestra `Ya existe una playlist llamada "X".` y el menú `1/2/0`; con `1` repite el nombre y pregunta `¿Deseas modificar descripción y visibilidad? (s/N): ` y reinvoca con una solicitud nueva sin `duplicadoAceptado`; con `2` reinvoca el caso de uso con `duplicadoAceptado: true`, de modo que Business omite la comprobación ya resuelta y solicita la confirmación final a través del canal inyectado; con `0` muestra `Creación cancelada. No se creó ninguna playlist.` sin invocar el caso de uso ni añadir registro;
  - presenta la confirmación final `(s/N): ` a través del canal inyectado en todo flujo interactivo y hace que el canal devuelva `cancelada` ante `N`, otra respuesta y `Ctrl+C`, sin crear ni registrar;
  - traduce `Cancelado` —devuelto por Business cuando el canal responde `cancelada`— en retorno al menú (o fin del flujo en comando directo) sin registrar y sin mostrar literales adicionales.
- **Prueba prevista**: TC-020
- **Criterio de finalización**: TC-020 en verde con dobles de caso de uso y de peticiones; ninguna función supera complejidad cognitiva 15; el coordinador no importa de `src/data/` ni ejecuta efectos secundarios directos.
- **Trazabilidad**: `OBJ-001 → RF-001, RF-002, RNF-002 → UC-001, UC-001-A1, UC-001-E1, UC-001-E2, UC-001-E3 → AC-001, AC-003, AC-004, AC-005 → TASK-014 → TC-020`
- **TDD previsto**: RED: TC-020 falla porque el coordinador no existe; GREEN: implementar la traducción de desenlaces y los dos bucles de reingreso; REFACTOR: descomponer en funciones por desenlace sin cambiar respuestas observables.

### TASK-015: Presentation — comando directo `spoty create-new-playlist`

- **Tipo**: code
- **Estado**: DONE (TC-021 en verde; evidencia RED → GREEN → REFACTOR en `TDD_LOG.md` § TASK-015)
- **Requisitos**: RF-001, RF-002, RNF-002, RNF-003, RNF-005
- **Casos de uso**: UC-001 (disparador de comando directo), UC-001-E3
- **Criterios**: AC-002, AC-005
- **Dependencias**: TASK-010, TASK-013, TASK-014
- **Archivos previstos**: alta en `handleCommand` de `src/cli-main.ts` más un analizador de argumentos orientativo en Presentation
- **Resultado verificable**: el comando `spoty create-new-playlist` queda registrado como punto de entrada funcional y:
  - analiza `--name`, `--description`, `--public` y `--private` sin decidir reglas de dominio: los cuatro ejemplos aprobados inician el flujo con la descripción por defecto `"Playlist sin descripción"` cuando `--description` falta;
  - la ausencia o doble presencia de visibilidad produce `Se debe declarar flag único en comando --public o --private` sin continuar hasta corregir la invocación;
  - el nombre ausente o fuera de 3-100 produce `Error en longitud del nombre de la playlist, mínimo 3, máximo 100 caracteres totales.` y continúa en modo interactivo con `Nombre de la playlist (3-100 caracteres):`;
  - con todos los parámetros válidos y sin duplicado, el comando crea directamente sin confirmación adicional (P-001, AC-002 y `ARCHITECTURE.md` §6.1); cualquier reingreso interactivo posterior sí pide confirmación;
  - delega en el coordinador con los mismos tipos que la vía de menú.
- **Prueba prevista**: TC-021
- **Criterio de finalización**: TC-021 en verde; los 4 ejemplos aprobados y los 2 rechazos de AC-002 cubiertos; el comando no contiene reglas de validación ni de duplicados propias.
- **Trazabilidad**: `OBJ-001 → RF-001, RF-002 → UC-001, UC-001-E3 → AC-002, AC-005 → TASK-015 → TC-021`
- **TDD previsto**: RED: TC-021 falla porque el comando no existe ni el analizador devuelve resultados; GREEN: registrar el comando y analizar indicadores delegando al coordinador; REFACTOR: separar análisis de argumentos de la orquestación sin cambiar respuestas.

### TASK-016: Presentation — opción `4. Crear playlist vacía` del menú interactivo

- **Tipo**: code
- **Estado**: DONE (TC-022 en verde; evidencia RED → GREEN → REFACTOR en `TDD_LOG.md` § TASK-016)
- **Requisitos**: RF-001, RF-002, RNF-002, RNF-003, RNF-005
- **Casos de uso**: UC-001 (disparador de menú interactivo)
- **Criterios**: AC-003
- **Dependencias**: TASK-010, TASK-011, TASK-014
- **Archivos previstos**: `showMenu`, `runInteractiveMode` y `promptMenuChoice` en Presentation
- **Resultado verificable**: el menú principal muestra `4. Crear playlist vacía` y la ayuda pasa a `(navega con 0-4,9, Ctrl+C para cancelar)`; la opción `4` enruta al coordinador con las peticiones y la confirmación del flujo interactivo; las opciones existentes `1`, `2`, `3`, `9` y `0` conservan su comportamiento. Ajuste de coherencia interna incluido: las etiquetas que `promptMenuChoice` devuelve junto a la elección y el texto del selector se alinean con la numeración real del menú (`3. Descargar biblioteca`, `4. Crear playlist vacía`, `9. Cerrar sesión`, `0. Salir`), porque hoy apuntan a `4`/`5` de forma incoherente.
- **Prueba prevista**: TC-022
- **Criterio de finalización**: TC-022 en verde; AC-003 cubierto: ayuda literal, peticiones, visibilidad preseleccionada, confirmación y `Ctrl+C`; Biome y `tsc` en verde.
- **Trazabilidad**: `OBJ-001 → RF-001, RF-002, RNF-002 → UC-001 → AC-003 → TASK-016 → TC-022`
- **TDD previsto**: RED: TC-022 falla porque la opción 4 no existe y la ayuda sigue diciendo `0-3,9`; GREEN: añadir ítem, ruta y ayuda literal; REFACTOR: unificar la fuente de etiquetas del menú sin cambiar opciones.

### TASK-017: Integración — arnés de extremo a extremo con Spotify simulado

- **Tipo**: integration
- **Estado**: DONE (TC-023 en verde; evidencia RED → GREEN → REFACTOR en `TDD_LOG.md` § TASK-017)
- **Requisitos**: RF-001, RF-002, RNF-001, RNF-003, RNF-004, RNF-005
- **Casos de uso**: UC-001 (todos los flujos)
- **Criterios**: AC-001, AC-002, AC-003, AC-004, AC-005
- **Dependencias**: TASK-013, TASK-015, TASK-016
- **Archivos previstos**: utilidades de prueba bajo `tests/` (orientativo)
- **Resultado verificable**: utilidades que permiten ejecutar el comando y el menú de extremo a extremo sin red real y sin tocar `data/` real: Spotify simulado (punto de inyección de `fetch` o `msw`, ya presente en `devDependencies`), ficheros de tokens y de registro en directorio temporal mediante `SPOTY_TOKENS_FILE` y `SPOTY_LOG_FILE`, salida de consola capturada y entrada interactiva simulada (incluida la interrupción `Ctrl+C`).
- **Prueba prevista**: TC-023
- **Criterio de finalización**: TC-023 en verde; ninguna prueba del plan necesita Internet, credenciales reales ni escritura en el repositorio.
- **Trazabilidad**: `OBJ-001 → RF-001, RF-002, RNF-001, RNF-004 → UC-001 → AC-001, AC-002, AC-003, AC-004, AC-005 → TASK-017 → TC-023`
- **TDD previsto**: RED: TC-023 falla porque el arnés no existe; GREEN: montar simulación de red, directorios temporales y captura de salida; REFACTOR: fijar utilidades compartidas sin cambiar resultados.

### TASK-018: Aceptación — AC-001, AC-002 y AC-004 sobre comando directo

- **Tipo**: test
- **Estado**: DONE (TC-024, TC-025 en verde; evidencia RED → GREEN → REFACTOR en `TDD_LOG.md` § TASK-018)
- **Requisitos**: RF-001, RF-002, RNF-001, RNF-002, RNF-006
- **Casos de uso**: UC-001 (principal, E1, E2, E3)
- **Criterios**: AC-001, AC-002, AC-004
- **Dependencias**: TASK-017
- **Archivos previstos**: suites de aceptación bajo `tests/` (orientativo)
- **Resultado verificable**: escenarios ejecutables escritos en español con las palabras clave `Dado`, `Cuando`, `Entonces`, `Y` y `Pero` y con las etiquetas `@AC-001`, `@AC-002`, `@AC-004` que verifican: creación única con mensaje `Playlist creada: "Viaje 2026" (privada, descripción: "Carretera", id: ..., enlace: ...)` con identificador y enlace e inicio y éxito registrados sin datos sensibles; los 4 ejemplos de invocación del comando y los 2 rechazos con sus literales exactos; los mensajes de ausencia de sesión, 401, 403, 429 agotado tras 3 reintentos y fallo genérico, con registro de la causa sin cuerpo sensible.
- **Prueba prevista**: TC-024, TC-025
- **Criterio de finalización**: TC-024 y TC-025 en verde; los pasos Gherkin de AC-001, AC-002 y AC-004 tienen correspondencia uno a uno con aserciones; ningún escenario requiere modificación de `ACCEPTANCE_CRITERIA.feature`.
- **Trazabilidad**: `OBJ-001 → RF-001, RF-002, RNF-001, RNF-002, RNF-006 → UC-001 → AC-001, AC-002, AC-004 → TASK-018 → TC-024, TC-025`
- **TDD previsto**: RED: los escenarios fallan sobre el arnés; GREEN: solo se corrigen fallos reales de implementación, nunca el criterio; REFACTOR: agrupar pasos comunes sin perder cobertura.

### TASK-019: Aceptación — AC-003 y AC-005 sobre menú interactivo, validación y duplicados

- **Tipo**: test
- **Estado**: DONE (TC-026, TC-027 en verde; evidencia RED → GREEN → REFACTOR en `TDD_LOG.md` § TASK-019)
- **Requisitos**: RF-001, RF-002, RNF-002, RNF-006
- **Casos de uso**: UC-001 (principal y A1)
- **Criterios**: AC-003, AC-005
- **Dependencias**: TASK-017
- **Archivos previstos**: suites de aceptación bajo `tests/` (orientativo)
- **Resultado verificable**: escenarios ejecutables en español con `@AC-003` y `@AC-005` que verifican: la opción `4. Crear playlist vacía`, la ayuda `(navega con 0-4,9, Ctrl+C para cancelar)`, las peticiones de nombre y descripción, la lista de visibilidad con pública preseleccionada, la confirmación `(s/N): ` donde solo `s` confirma, el aborto con `Ctrl+C` sin crear; y la validación de nombre, el duplicado con su menú de opciones, la opción `1` con la pregunta de modificación, la opción `2` hacia la confirmación y la opción `0` con `Creación cancelada. No se creó ninguna playlist.` sin crear nada.
- **Prueba prevista**: TC-026, TC-027
- **Criterio de finalización**: TC-026 y TC-027 en verde; los pasos Gherkin de AC-003 y AC-005 tienen correspondencia uno a uno con aserciones; se respeta la nota O-004: si conviene dividir AC-002 en escenarios adicionales se hace solo en las suites, sin renumerar identificadores.
- **Trazabilidad**: `OBJ-001 → RF-001, RF-002, RNF-002, RNF-006 → UC-001, UC-001-A1 → AC-003, AC-005 → TASK-019 → TC-026, TC-027`
- **TDD previsto**: RED: los escenarios fallan sobre el arnés; GREEN: corregir implementación, nunca el criterio; REFACTOR: extraer pasos comunes sin perder cobertura.

### TASK-020: Verificación transversal de requisitos no funcionales

- **Tipo**: test
- **Estado**: DONE (TC-028 en verde; evidencia RED → GREEN → REFACTOR en `TDD_LOG.md` § TASK-020)
- **Requisitos**: RNF-001, RNF-002, RNF-003, RNF-004, RNF-005, RNF-006
- **Casos de uso**: UC-001
- **Criterios**: AC-001, AC-002, AC-003, AC-004, AC-005
- **Dependencias**: TASK-001 a TASK-019
- **Archivos previstos**: comprobaciones automatizadas bajo `tests/` más salida de herramientas
- **Resultado verificable**, con evidencia en la fase de implementación:
  - RNF-001: búsqueda de patrones de testigo o secreto en la salida de consola, en `data/app.log` y en los ficheros generados, sin coincidencias; ninguna causa de error contiene cuerpos de respuesta.
  - RNF-002: revisión lingüística sin infracciones; los literales de usuario coinciden con los aprobados.
  - RNF-003: revisión de imports: Business no importa Presentation, CLI ni Pino; Data no contiene decisiones de dominio; Presentation no contiene reglas de validación o duplicados propias; el caso de uso se invoca sin `argv` ni `readline`.
  - RNF-004: sin dependencias nuevas salvo `@vitest/coverage-v8` como proveedor implícito de RNF-005 ya configurado en `vitest.config.ts` (replanificación `DISC-003`), sin binarios nativos y sin requisitos de ejecución que impidan el empaquetado SEA.
  - RNF-005: `tsc --noEmit` en modo estricto, Biome sin errores, Vitest completo en verde, cobertura mínima 80 % en el alcance 003 (`src/business/playlists/**` + `src/business/retry/**`) según `vitest.config.ts` re-acotado por `CR-001`, complejidad cognitiva menor de 15 por función y ausencia de `any`.
  - RNF-006: el registro de `data/app.log` contiene `info` de inicio y éxito, `warn` de duplicado y de cada reintento, y `error` final con causa, y no contiene entradas por cancelaciones.
  - Verificación de que `REQUIRED_SCOPES` ya incluye `playlist-modify-public` y `playlist-modify-private` sin cambio en la conexión (P-003).
- **Prueba prevista**: TC-028
- **Criterio de finalización**: TC-028 en verde más salidas limpias de Biome, `tsc` y Vitest; cualquier incidencia detectada se corrige antes de cerrar la tarea.
- **Trazabilidad**: `OBJ-001 → RNF-001, RNF-002, RNF-003, RNF-004, RNF-005, RNF-006 → UC-001 → AC-001, AC-002, AC-003, AC-004, AC-005 → TASK-020 → TC-028`
- **TDD previsto**: RED: TC-028 falla mientras falte cualquiera de las comprobaciones; GREEN: implementar las comprobaciones automatizables; REFACTOR: sin cambios de comportamiento.

### TASK-021: Documentación — evidencia TDD y cierre de trazabilidad de la planificación

- **Tipo**: docs
- **Estado**: DONE (TC-029 en verde con validación equivalente; revisión de contenido en `TDD_LOG.md` § TASK-021)
- **Requisitos**: RNF-002, RNF-005
- **Casos de uso**: UC-001
- **Criterios**: AC-001, AC-002, AC-003, AC-004, AC-005
- **Dependencias**: TASK-020
- **Archivos previstos**: `TDD_LOG.md` (raíz del repositorio)
- **Resultado verificable**: `TDD_LOG.md` recoge, por tarea de comportamiento, la evidencia de `RED → GREEN → REFACTOR` con fecha, prueba afectada y resultado; la matriz de este documento refleja el estado real de cada `TASK` y `TC`; toda la documentación generada permanece en español estricto.
- **Prueba prevista**: TC-029
- **Criterio de finalización**: TC-029 en verde; sin tareas de comportamiento sin evidencia; sin documentación relevante en inglés. Tarea documental: se sustituye TDD por validación verificable equivalente (revisión de contenido del registro).
- **Trazabilidad**: `OBJ-001 → RNF-002, RNF-005 → UC-001 → AC-001, AC-002, AC-003, AC-004, AC-005 → TASK-021 → TC-029`
- **Validación equivalente**: revisión de que cada `TASK-001` a `TASK-020` de comportamiento tiene al menos una entrada en `TDD_LOG.md` y una prueba en `TEST_PLAN.md`.

---

## 6. Matriz de trazabilidad OBJ → RF/RNF → UC → AC → TASK → TEST

| OBJ | RF/RNF | UC | AC | TASK | TC |
|---|---|---|---|---|---|
| OBJ-001 | RF-001 | UC-001 (principal, A1, E1, E3) | AC-001, AC-002, AC-003, AC-005 | TASK-001, TASK-002, TASK-005, TASK-006, TASK-008, TASK-012, TASK-013, TASK-014, TASK-015, TASK-016, TASK-017, TASK-018, TASK-019 | TC-001, TC-002, TC-003, TC-007, TC-008, TC-010, TC-011, TC-012, TC-018, TC-019, TC-020, TC-021, TC-022, TC-023, TC-024, TC-026, TC-027 |
| OBJ-001 | RF-002 | UC-001 (principal, A1, E1, E2, E3) | AC-001, AC-004, AC-005 | TASK-001, TASK-004, TASK-007, TASK-008, TASK-009, TASK-011, TASK-012, TASK-014, TASK-015, TASK-016, TASK-017, TASK-018, TASK-019 | TC-001, TC-006, TC-009, TC-011, TC-013, TC-014, TC-015, TC-017, TC-018, TC-020, TC-021, TC-022, TC-023, TC-024, TC-025, TC-026, TC-027 |
| OBJ-001 | RNF-001 | UC-001 | AC-004 | TASK-002, TASK-003, TASK-007, TASK-008, TASK-009, TASK-013, TASK-017, TASK-018, TASK-020 | TC-002, TC-004, TC-009, TC-015, TC-023, TC-025, TC-028 |
| OBJ-001 | RNF-002 | UC-001 | AC-001, AC-002, AC-003, AC-004, AC-005 | TASK-011, TASK-012, TASK-014, TASK-015, TASK-016, TASK-018, TASK-019, TASK-020, TASK-021 | TC-017, TC-018, TC-020, TC-021, TC-022, TC-024, TC-026, TC-028, TC-029 |
| OBJ-001 | RNF-003 | UC-001 | Verificación en arquitectura e implementación | TASK-001, TASK-002, TASK-003, TASK-008, TASK-010, TASK-013, TASK-014, TASK-015, TASK-016, TASK-017, TASK-020 | TC-001, TC-016, TC-019, TC-028 |
| OBJ-001 | RNF-004 | UC-001 | Verificación en arquitectura e implementación | TASK-010, TASK-017, TASK-020 | TC-016, TC-023, TC-028 |
| OBJ-001 | RNF-005 | UC-001 | Verificación en implementación | TASK-001 a TASK-017, TASK-020, TASK-021 | TC-005, TC-028, TC-029 |
| OBJ-001 | RNF-006 | UC-001 | AC-001, AC-004, AC-005 | TASK-003, TASK-004, TASK-008, TASK-009, TASK-013, TASK-018, TASK-019, TASK-020 | TC-004, TC-006, TC-010, TC-012, TC-013, TC-014, TC-015, TC-019, TC-024, TC-025, TC-027, TC-028 |

### Cobertura de criterios

| AC | TASK | TC |
|---|---|---|
| AC-001 | TASK-008, TASK-013, TASK-014, TASK-018 | TC-010, TC-019, TC-020, TC-024 |
| AC-002 | TASK-015, TASK-018 | TC-021, TC-024 |
| AC-003 | TASK-016, TASK-012, TASK-019 | TC-018, TC-022, TC-026 |
| AC-004 | TASK-002, TASK-004, TASK-007, TASK-009, TASK-018 | TC-002, TC-006, TC-009, TC-014, TC-015, TC-025 |
| AC-005 | TASK-005, TASK-006, TASK-014, TASK-019 | TC-007, TC-008, TC-020, TC-027 |

### Cobertura de reglas de negocio

| Regla | TASK | TC |
|---|---|---|
| BR-001 (sesión vía opción 1) | TASK-008, TASK-013 | TC-011, TC-019, TC-025 |
| BR-002 (resultado único con atributos) | TASK-002, TASK-008 | TC-002, TC-010 |
| BR-003 (sin estado ambiguo ante fallo) | TASK-007, TASK-009, TASK-014 | TC-009, TC-014, TC-015, TC-020 |
| BR-004 (nombre 3-100 tras recorte) | TASK-005, TASK-015 | TC-007, TC-021 |
| BR-005 (visibilidad obligatoria y excluyente) | TASK-005, TASK-015 | TC-007, TC-021 |
| BR-006 (duplicados solo propias) | TASK-002, TASK-006, TASK-008, TASK-014 | TC-003, TC-008, TC-012, TC-020 |
| BR-007 (confirmación `s/N` y cancelaciones) | TASK-008, TASK-012, TASK-014 | TC-010, TC-013, TC-018, TC-020 |

## 7. Notas formales no bloqueantes

| Nota | Contenido | Efecto |
|---|---|---|
| O-005 | `ARCHITECTURE.md` §2 conserva una mención desactualizada sobre la errata O-002, ya corregida en `SPECS.md` P-007 (`sin exponer tokens`). | Desfase documental a subsanar cuando se toque `ARCHITECTURE.md`; no se modifica en esta entrega y no bloquea `IMPLEMENTATION_READY`. |
| O-006 | `STATE.md` y `TRACEABILITY.md` aún declaran la inexistencia de `ARCHITECTURE.md` y ADR, redacción vigente en la revisión 0.2.0 pero desactualizada tras la arquitectura 0.1.0. | Desfase a subsanar al declarar formalmente los gates en `STATE.md`; no se modifican esos archivos en esta entrega y no bloquea `IMPLEMENTATION_READY`. |
| N-001 (criterio de alcance) | La confirmación final `(s/N): ` se solicita en todo flujo interactivo: opción 4 del menú, reingreso interactivo tras nombre inválido y menú de duplicados. La única vía sin confirmación es el comando directo con todos los parámetros válidos y sin duplicado. Lectura unificadora de P-001 (sin confirmación en la definición de CLI), P-002 y AC-003 (confirmación en menú), AC-002 (el comando «inicia el flujo»), UC-001 paso 5 («vuelve al menú») y `ARCHITECTURE.md` §6.1 frente a §6.4 y §6.5. | Criterio explícito en TASK-014 y TASK-015 para no decidirlo en silencio. Si el orquestador la clasifica como contradicción, corresponde registrar `DISC-XXX` y someterla a `change-analyzer` antes de implementar. |
| N-002 (criterio de alcance) | `Ctrl+C` aborta la creación sin crear ni registrar; en modo interactivo el control vuelve al menú principal y en comando directo termina el flujo sin crear, según BR-007, P-002 y AC-003. | Criterio explícito en TASK-012 y TASK-014. Si se considera ambiguo el destino posterior, registrar `DISC-XXX`. |
| N-003 (criterio de alcance) | El `warn` de duplicado exigido por P-004 y RNF-006 se emite al detectar la coincidencia, antes de la decisión del usuario; una posterior cancelación con la opción `0` no añade ningún registro (P-007: las cancelaciones no generan registro), pero no elimina ese `warn` previo. | Criterio explícito en TASK-008 y TASK-014 para evitar que se omita la `advertencia` exigida. |
| N-004 (criterio de alcance) | TASK-016 alinea las etiquetas del selector de menú y el texto del selector con la numeración real `0-4,9` (hoy `4`/`5` incoherentes con las opciones `3`/`9`). | Ajuste de coherencia interna derivado de la nueva opción 4; si se considerara cambio de alcance, registrar `DISC-XXX` antes de implementarlo. |
| N-005 (replanificación `DISC-002`) | El canal de confirmación (`canalConfirmacion` en la solicitud) y la señal `duplicadoAceptado` resuelven la omisión de planificación clasificada `PLANNING_OMISSION`: la confirmación, la cancelación, el menú `1/2/0` y el desenlace `Cancelado` ya estaban en RF-002, BR-007, UC-001/UC-001-A1, AC-001/AC-003/AC-005 y RNF-006; solo faltaba el medio de transporte previsto en arquitectura, contratos, tareas y pruebas. | Criterio explícito en TASK-008 y TASK-014. No altera requisitos ni literales, no crea `CR-XXX` y no requiere aprobación de alcance; `DependenciasCreacion` conserva los cuatro puertos para mantener TC-001 en verde. |

## 8. Propuesta de gate `IMPLEMENTATION_READY`

Condiciones cumplidas por esta entrega:

1. `TASKS.md` existe con 21 tareas `TASK-XXX` identificadas, en estado inicial `PENDING`, cada una con tipo, descripción concreta, requisitos, casos de uso, criterios, dependencias, resultado verificable, prueba prevista y trazabilidad `OBJ → RF/RNF → UC → AC → TASK → TEST`.
2. Las dependencias permiten el orden exigido: Data (gateway, registro y retry) → Business (validación, duplicados, errores y caso de uso) → Presentation (punto de entrada, literales, prompts, composición, coordinador, comando y menú 4) → integración E2E y cierre.
3. `TEST_PLAN.md` asocia al menos un `TC-XXX` a cada tarea y cobertura de evidencia para AC-001 a AC-005, con niveles de unidad, integración, aceptación y transversal.
4. El punto de entrada de cada vía está planificado como tarea explícita (TASK-015 comando directo y TASK-016 menú opción 4), conforme a la regla de completitud funcional.
5. No existen solicitudes `CR-XXX` pendientes. `DISC-002` (`PLANNING_OMISSION`) queda cubierto en planificación por esta versión 0.1.1 (TASK-008 y TASK-014 redefinidas, TC-010 y TC-013 precisados), con `ARCHITECTURE.md` y `TRACEABILITY.md` aún pendientes de precisión/alineación por estar fuera del alcance editable de esta sesión; `DISC-003` (`PLANNING_OMISSION`) queda cubierto en planificación por esta versión 0.1.2 (TASK-020 §RNF-004 precisada con `@vitest/coverage-v8`, TC-028 y `TEST_PLAN.md` §8/§10 actualizados); `DISC-001` (`TECHNICAL_BLOCKER`) sigue sin bloqueo funcional; las notas N-001 a N-005 y O-005/O-006 quedan registradas y no bloquean.
6. La documentación está en español estricto y no modifica artefactos aprobados.
7. `SPEC_READY` es declarable según `SPEC_REVIEW.md` con addendum y aprobación humana dada; el acto formal de declaración en `STATE.md` corresponde al orquestador.

Declaración: **`IMPLEMENTATION_READY` propuesta**, sujeta a la revisión de `change-analyzer` o del agente que gestione el gate. No se declara `FEATURE_DONE`: no existe implementación, evidencia de pruebas ejecutadas ni validación final.
