# Arquitectura: Creación de playlist vacía

## 1. Metadatos

- **Identificador**: 003-creacion-de-playlist-vacia
- **Versión de especificación base**: 0.2.0 del 2026-10-08
- **Versión de arquitectura**: 0.1.0
- **Fecha**: 2026-10-08
- **Estado**: Propuesta para re-revisión de `spec-reviewer` más aprobación humana explícita
- **Artefactos base**: `SPECS.md`, `REQUIREMENTS.md`, `USE_CASES.md`, `ACCEPTANCE_CRITERIA.feature`, `TRACEABILITY.md`, `STATE.md`, `SPEC_REVIEW.md` (versión 0.2.0 con `PASS_WITH_NOTES`)
- **Alcance de esta entrega**: únicamente este `ARCHITECTURE.md`. No se crean `TASKS.md`, `TEST_PLAN.md`, código ni pruebas. No se declara `IMPLEMENTATION_READY`. No se modifica ningún artefacto de especificación.

## 2. Alcance arquitectónico y límites

Esta arquitectura describe cómo construir la solución sin modificar qué debe hacer.

- Respeta íntegramente las definiciones humanas aprobadas P-001 a P-007 y el cierre C-1 a C-6 de la especificación 0.2.0.
- No añade comportamiento: nombre de 3 a 100 caracteres visibles tras recorte, descripción por defecto `"Playlist sin descripción"`, visibilidad obligatoria excluyente `--public | --private`, sin modalidad colaborativa, reingreso interactivo, duplicados solo contra propias con comparación exacta sensible a mayúsculas tras recorte, advertencia más menú `1/2/0`, reintentos ante 429 hasta 3 veces con `Retry-After` o 10 segundos, mensajes exactos aprobados y registro Pino en `data/app.log` sin datos sensibles.
- Conserva identificadores estables `OBJ-001`, `RF-001`, `RF-002`, `RNF-001` a `RNF-006`, `UC-001` y `AC-001` a `AC-005`.
- No corrige aquí la errata O-002 de `SPECS.md`; queda pendiente al tocar dicho documento en fase posterior, según indica `SPEC_REVIEW.md`.
- Si apareciera un conflicto entre requisitos y restricciones arquitectónicas, se registraría `ARCHITECTURE_CONFLICT` y se devolvería el control al orquestador sin redefinir el alcance. En esta propuesta no existe tal conflicto (ver §13).

## 3. Entradas al flujo

Esta sección es explícita y obligatoria. Todo flujo de usuario entra por Presentation y desciende por `Presentation → Business → Data`.

| Caso | Actor | Punto de entrada | Cadena completa |
|---|---|---|---|
| UC-001 vía comando directo | Usuario autenticado | Comando `spoty create-new-playlist --name "..." [--description "..."] (--public \| --private)` gestionado en `src/cli.ts` (`handleCommand`) | `Actor → Comando create-new-playlist → Presentation (analiza indicadores, valida presencia y exclusividad sintáctica, delega y presenta mensajes) → Business (valida reglas, comprueba duplicados, ordena creación, clasifica errores) → Data (crea en Spotify, lista propias para duplicados, registra con Pino)` |
| UC-001 vía menú interactivo | Usuario autenticado | Opción `4. Crear playlist vacía` del menú principal en modo interactivo (`runInteractiveMode` en `src/cli.ts`), con ayuda `(navega con 0-4,9, Ctrl+C para cancelar)` | `Actor → Opción 4 del menú → Presentation (muestra ayuda, peticiones literales, lista de visibilidad con pública preseleccionada, confirmación `(s/N): `, bucles de reingreso y menú de duplicados) → Business (mismas reglas y orden de creación reutilizables) → Data (mismas operaciones de Spotify y registro)` |

Notas:

- `GUI`, evento y API programática no son puntos de entrada de usuario en esta funcionalidad, según especificación. La reutilización futura por clientes no CLI se conserva como restricción transversal (§8).
- La sesión válida se obtiene siempre vía opción 1 (`connect`), reutilizando el flujo existente. Sin sesión, Presentation informa con el literal aprobado y no invoca la creación en Business.
- `Ctrl+C`, la respuesta distinta de `s` en la confirmación y la opción `0` del menú de duplicados cancelan sin crear. Presentation aborta el flujo y no llama a Data para crear ni para registrar.

## 4. Vista de capas

```mermaid
graph TD
    CLI["Presentation\n- src/cli.ts: comando create-new-playlist, opción 4, ayuda 0-4,9\n- src/presentation/prompts.ts: peticiones literales, confirmaciones s/N, menús\n- src/presentation/messages.ts: literales exactos aprobados\n- src/presentation/console.ts: formato de salida"]
    BIZ["Business\n- playlists/types.ts: tipos Solicitud, Resultado, errores de dominio\n- playlists/validacion.ts: predicados puros de nombre, visibilidad y duplicado\n- playlists/crear-playlist.ts: caso de uso reutilizable\n- auth existente: tokens, profile, errors\n- retry existente parametrizado"]
    DATA["Data\n- http/playlists-client.ts: crear playlist, listar propias paginadas\n- http/spotify-client.ts existente: base HTTP y SDK\n- storage existente: tokens-file, log-file\n- logging/pino-setup.ts: Pino hacia data/app.log"]
    SPOT["Spotify (externa)\n- POST crear playlist\n- GET listar playlists propias\n- Códigos 401, 403, 429, genérico\n- Cabecera Retry-After"]
    FS["Sistema de ficheros\n- data/app.log"]

    CLI --> BIZ : invoca caso de uso con Solicitud
    BIZ --> DATA : usa puerto PlaylistGateway
    DATA --> SPOT : HTTPS
    DATA --> FS : Pino append
```

### 4.1. Presentation (coordina interacción, sin reglas críticas)

Responsabilidades:

- Analizar los indicadores del comando (`--name`, `--description`, `--public`, `--private`) sin decidir reglas de dominio: detecta ausencia de `--name`, ausencia o duplicidad de visibilidad y delega el dictamen a Business; presenta `Se debe declarar flag único en comando --public o --private` cuando Business lo indica.
- Mostrar el menú principal con la opción `4. Crear playlist vacía` y la ayuda `(navega con 0-4,9, Ctrl+C para cancelar)`.
- Emitir las peticiones literales aprobadas: `Nombre de la playlist (3-100 caracteres):`, `Descripción (opcional, Enter para usar "Playlist sin descripción"):`, lista de visibilidad con pública preseleccionada, confirmación final con formato `(s/N): `, menú de duplicados `¿Qué deseas hacer? 1. Modificar nombre 2. Crear de todos modos con el mismo nombre 0. Cancelar sin crear / Elige (0-2):` y pregunta `¿Deseas modificar descripción y visibilidad? (s/N): `.
- Gestionar los bucles de reingreso: ante longitud inválida en comando directo muestra `Error en longitud del nombre de la playlist, mínimo 3, máximo 100 caracteres totales.` y continúa con la petición de nombre; en menú repite la petición correspondiente; ante duplicado presenta el menú `1/2/0`; ante opción `1` repite el nombre y pregunta si se desean modificar descripción y visibilidad.
- Aplicar la convención de confirmación: solo `s` confirma; `N` u otra respuesta vuelve al menú sin crear y sin registrar. `Ctrl+C` y `0` abortan sin crear y, cuando corresponde al flujo de duplicados, muestran `Creación cancelada. No se creó ninguna playlist.`.
- Presentar el mensaje único de éxito `Playlist creada: "X" (pública/privada, descripción: "...", id: ..., enlace: ...)` y cada mensaje exacto de error de P-003 y P-004, obtenidos como datos desde Business, sin componer lógica de decisión.
- Traducir cancelaciones (`CANCELLED`) en retorno al menú sin registro.

Prohibiciones:

- No concentra reglas de negocio críticas: no decide longitudes, no decide equivalencia de duplicados, no decide reintentos ni mapeo de estados HTTP.
- No accede a Spotify ni al sistema de ficheros directamente.

Módulos previstos (nombres orientativos, sin crear código en esta fase):

- `src/cli.ts`: alta del comando `create-new-playlist`, alta de la opción `4`, ayuda `0-4,9`, enrutado hacia el coordinador de Presentation.
- `src/presentation/prompts.ts`: extensión con peticiones de nombre, descripción, visibilidad y confirmaciones `s/N`, reutilizando el patrón `prompt` y `confirmExit` existente.
- `src/presentation/messages.ts`: alta de los literales exactos aprobados como constantes, sin alterar los existentes.
- `src/presentation/console.ts`: reutilización de formato sin cambios.

### 4.2. Business (reglas reutilizables, sin dependencia de CLI)

Responsabilidades:

- Exponer un caso de uso reutilizable por futuros clientes no CLI, por ejemplo `crearPlaylistVacia(solicitud, dependencias)`, con tipos explícitos de entrada y de resultado (`Éxito`, `ErrorValidacion`, `Duplicado`, `SinSesion`, `SesionCaducada`, `PermisosInsuficientes`, `LimiteAgotado`, `FalloInesperado`, `Cancelado`).
- Validar de forma pura: recorte de espacios en extremos, medición en caracteres visibles, intervalo 3 a 100, vacío o solo espacios como inválido, descripción efectiva (valor aportado o `"Playlist sin descripción"`), visibilidad obligatoria y excluyente, rechazo de modalidad colaborativa.
- Decidir duplicados: comparación exacta sensible a mayúsculas tras recorte, solo contra listas propias recibidas desde Data. Business no lista; recibe la lista y aplica el predicado.
- Clasificar errores de Data en resultados de dominio: 401 como sesión caducada, 403 como permisos insuficientes, 429 persistente tras reintentos como límite agotado, resto como fallo inesperado con causa depurable sin datos sensibles.
- Definir la política de reintentos ante 429 (hasta 3 intentos, respeto de `Retry-After` cuando existe, espera de 10 segundos en su ausencia) como datos de política inyectables, sin temporizadores propios.
- Registrar la intención de eventos de observabilidad como datos estructurados (inicio, éxito, duplicado, reintento, fallo final) para que Data los escriba; Business no escribe en disco.

Prohibiciones estrictas:

- No importa Presentation.
- No depende de CLI: sin `console.log`, sin `process.argv`, sin `process.exit`, sin interacción directa con terminal.
- Sin entrada o salida directa: sin `fetch`, sin sistema de ficheros, sin Pino directo.

Módulos previstos:

- `src/business/playlists/types.ts`: solicitud (nombre en bruto, descripción opcional, visibilidad), descripción efectiva, resultado discriminado, errores de dominio.
- `src/business/playlists/validacion.ts`: funciones puras `recortarNombre`, `esLongitudValida`, `resolverDescripcionEfectiva`, `resolverVisibilidad`, `esDuplicadoPropio`.
- `src/business/playlists/crear-playlist.ts`: orquestación del caso de uso con dependencias inyectadas (puerta de acceso a datos, sesión, registro, espera).
- Reutilización sin acoplamiento: `src/business/auth/tokens.ts` (`getStoredTokens`), `src/business/auth/errors.ts` (jerarquía existente), `src/business/retry/retry.ts` (política parametrizada, ver ADR-001).

La firma del caso de uso acepta valores simples (cadenas, enumeración de visibilidad) y dependencias por parámetros, de modo que una futura GUI u otro cliente invoque la misma función sin pasar por `cli.ts` ni por `prompts.ts`.

### 4.3. Data (efectos secundarios encapsulados)

Responsabilidades:

- Implementar el puerto `PlaylistGateway` con dos operaciones: `crearPlaylist` (nombre efectivo, descripción efectiva, visibilidad, testigo de sesión) y `listarPlaylistsPropias` (paginada, solo del usuario vigente).
- Encapsular el acceso a Spotify (SDK o HTTPS), la paginación de propias para duplicados, la lectura de la cabecera `Retry-After`, el acceso a `data/tokens.json` vía `tokens-file.ts` existente y la escritura técnica con Pino en `data/app.log` vía `pino-setup.ts` existente.
- Traducir respuestas HTTP en errores tipados con estado (`401`, `403`, `429` con `reintentoTras`, genérico con causa) sin componer mensajes de usuario; los literales los elige Presentation a partir del resultado de Business.
- Garantizar que ningún testigo, secreto o cuerpo sensible llegue a registros, consola ni ficheros generados; antes de registrar, depura los campos.

Prohibiciones:

- No decide reglas de negocio (no valida longitudes, no decide duplicados, no decide confirmaciones).
- No presenta mensajes de usuario.

Módulos previstos:

- `src/data/http/playlists-client.ts`: implementación de `PlaylistGateway` tras interfaces, con paginación de propias y extracción de `Retry-After`.
- Reutilización: `src/data/http/spotify-client.ts` como base, `src/data/storage/tokens-file.ts`, `src/data/storage/log-file.ts`, `src/data/logging/pino-setup.ts` (`getLogger`) sin cambios de comportamiento.

## 5. Contratos e interfaces

Para aislar efectos y permitir pruebas con dobles sin red ni disco:

- `SesionProveedor`: expone `obtenerSesionVigente()` a partir de `getStoredTokens` o `checkExistingSession`. Si no hay sesión, Business devuelve `SinSesion` y Presentation muestra `No hay sesión activa. Conecta con Spotify con la opción 1`.
- `PlaylistGateway`: expone `crearPlaylist(entrada)` y `listarPlaylistsPropias()`. Data lo implementa; Business lo consume sin conocer HTTP, SDK ni paginación interna.
- `RegistroTecnico`: expone `info`, `advertencia` y `error` con campos estructurados (nombre efectivo, visibilidad, descripción efectiva, identificador, intento, estado, causa depurada). Data lo implementa sobre Pino; Business solo emite la intención.
- `Espera`: expone `esperar(milisegundos)` para los reintentos 429. En producción espera real (`Retry-After` o 10 segundos); en pruebas se sustituye por espera inmediata. Evita acoplar Business a temporizadores y preserva la compatibilidad con binario único.

Esta separación conserva la dirección `Presentation → Business → Data` y evita ciclos: Business define los puertos que necesita; Data los implementa; Presentation compone ambos en el arranque del comando y de la opción 4.

## 6. Flujos por capa

### 6.1. Comando directo válido

1. Presentation analiza `create-new-playlist --name "Viaje 2026" --private [--description "Carretera"]`.
2. Presentation comprueba sesión vía `SesionProveedor`. Sin sesión, muestra el literal de sesión y termina.
3. Presentation invoca el caso de uso con la solicitud en bruto.
4. Business recorta el nombre, valida 3 a 100, resuelve descripción efectiva y visibilidad, pide a Data la lista de propias solo si el nombre es sintácticamente válido, aplica `esDuplicadoPropio` y, si no hay duplicado, ordena `crearPlaylist`.
5. Data crea en Spotify, devuelve identificador y enlace, y registra `info` de inicio y éxito.
6. Presentation muestra `Playlist creada: "X" (pública/privada, descripción: "...", id: ..., enlace: ...)` con los datos devueltos.

Cubre AC-001 y AC-002. Trazabilidad: `OBJ-001 → RF-001, RF-002 → UC-001 → AC-001, AC-002`.

### 6.2. Comando directo con longitud inválida

Business devuelve `ErrorValidacion`. Presentation muestra `Error en longitud del nombre de la playlist, mínimo 3, máximo 100 caracteres totales.` y continúa en modo interactivo con `Nombre de la playlist (3-100 caracteres):`, repitiendo hasta obtener un valor válido o abortar con `Ctrl+C`. No se crea nada mientras la entrada siga inválida. Cubre UC-001-E3 y AC-002/AC-005.

### 6.3. Comando directo con visibilidad inválida

Si falta la visibilidad o aparecen ambos indicadores, Business devuelve `ErrorValidacion` de visibilidad. Presentation muestra `Se debe declarar flag único en comando --public o --private` y no continúa hasta corregir la invocación. Cubre UC-001-E3 y AC-002.

### 6.4. Menú interactivo (opción 4)

1. Presentation muestra la ayuda, pide `Nombre de la playlist (3-100 caracteres):`, luego `Descripción (opcional, Enter para usar "Playlist sin descripción"):` y la lista de visibilidad con pública preseleccionada.
2. Presentation invoca el mismo caso de uso que el comando directo, con idénticos tipos.
3. Business aplica idénticas reglas; Data ejecuta idénticas operaciones.
4. Presentation pide confirmación final `(s/N): `; solo `s` confirma. `N` u otra respuesta vuelve al menú sin crear y sin registrar. `Ctrl+C` aborta sin crear en cualquier petición.
5. Ante éxito, Presentation muestra el mismo mensaje único que en comando directo.

Cubre AC-003. Trazabilidad: `OBJ-001 → RF-001, RF-002 → UC-001 → AC-003`.

### 6.5. Duplicados contra propias (UC-001-A1)

1. Business detecta coincidencia exacta sensible a mayúsculas tras recorte y devuelve `Duplicado` con el nombre efectivo.
2. Data registra `warn` con el nombre (sin datos sensibles) mediante `RegistroTecnico`.
3. Presentation muestra `Ya existe una playlist llamada "X".` y el menú `¿Qué deseas hacer? 1. Modificar nombre 2. Crear de todos modos con el mismo nombre 0. Cancelar sin crear / Elige (0-2):`.
4. Con `1`, Presentation repite la petición de nombre y pregunta `¿Deseas modificar descripción y visibilidad? (s/N): `; con `s` repite esas peticiones, con otra respuesta conserva valores y vuelve a invocar el caso de uso.
5. Con `2`, Presentation continúa hacia la confirmación final `(s/N): `.
6. Con `0`, Presentation muestra `Creación cancelada. No se creó ninguna playlist.`, no crea y no registra.

Cubre AC-005. Trazabilidad: `OBJ-001 → RF-001, RF-002, RNF-006 → UC-001 → AC-005`.

### 6.6. Errores de sesión, autorización y servicio (UC-001-E1, UC-001-E2)

| Estado desde Data | Resultado de Business | Mensaje de Presentation | Registro |
|---|---|---|---|
| Sin sesión | `SinSesion` | `No hay sesión activa. Conecta con Spotify con la opción 1` | Sin registro |
| 401 | `SesionCaducada` | `Sesión caducada. Vuelve a conectar con Spotify.` | `error` final con causa depurada |
| 403 | `PermisosInsuficientes` | `Permisos insuficientes para crear la playlist.` | `error` final con causa depurada |
| 429 persistente tras hasta 3 reintentos | `LimiteAgotado` | `Vuelva a intentarlo más tarde` | `warn` por cada reintento (intento y estado) más `error` final |
| Fallo genérico o rechazo de Spotify no contemplado | `FalloInesperado` | `No se pudo crear la playlist por un error inesperado.` | `error` final con causa depurada, sin cuerpo sensible |

La política 429 respeta `Retry-After` cuando la respuesta lo incluye y espera 10 segundos en su ausencia, con máximo de 3 reintentos (ver ADR-001). Cubre AC-004. Trazabilidad: `OBJ-001 → RF-002, RNF-001, RNF-006 → UC-001 → AC-004`.

### 6.7. Cancelaciones

`Ctrl+C`, respuesta distinta de `s` en la confirmación final y opción `0` de duplicados no generan registro Pino, no crean lista y no dejan estado ambiguo. Presentation gestiona el aborto; Business devuelve `Cancelado` cuando ya había sido invocado; Data no escribe.

## 7. Reutilización de infraestructura existente sin acoplamiento

- Autenticación: se reutilizan `REQUIRED_SCOPES` (ya incluye `playlist-modify-public` y `playlist-modify-private` en `src/business/auth/types.ts`), `getStoredTokens` y `checkExistingSession`. No se modifica el flujo de conexión.
- Reintentos: se reutiliza `withRetry` y el concepto de `RetryPolicy` de `src/business/retry/retry.ts`, parametrizado para esta funcionalidad (ver ADR-001). No se duplica la lógica de espera en el módulo de playlists.
- Peticiones y mensajes: se reutilizan los patrones de `src/presentation/prompts.ts`, `src/presentation/messages.ts` y `src/presentation/console.ts`, extendidos con los literales exactos aprobados. Los literales existentes no se alteran.
- Registro: se reutiliza `getLogger()` de `src/data/logging/pino-setup.ts` hacia `data/app.log`. Business no importa Pino; Data lo encapsula tras `RegistroTecnico`.
- Cliente Spotify: se reutiliza `src/data/http/spotify-client.ts` como base; la creación y el listado de propias viven en el nuevo `playlists-client.ts` tras el puerto `PlaylistGateway`, de modo que un cambio de SDK o de paginación no afecte a Business ni a Presentation.

## 8. Reutilización futura por GUI u otro cliente

- El caso de uso `crearPlaylistVacia` no recibe `argv`, ni `readline`, ni códigos de menú. Recibe una solicitud con nombre, descripción opcional y visibilidad, más las dependencias `SesionProveedor`, `PlaylistGateway`, `RegistroTecnico` y `Espera`.
- Presentation CLI (comando y menú) es un adaptador delgado: traduce indicadores y respuestas interactivas a la solicitud, invoca el caso de uso y traduce el resultado a literales.
- Una futura GUI reutilizaría el mismo caso de uso con otro adaptador (formulario y diálogo de confirmación) sin duplicar validación, duplicados, reintentos ni clasificación de errores.
- Los mensajes de usuario permanecen en Presentation, de modo que otro cliente puede presentarlos con sus propios componentes manteniendo la misma semántica de resultado.

## 9. Seguridad

- Ningún testigo, secreto, credencial ni dato personal innecesario aparece en registros, consola ni ficheros generados (RNF-001).
- Data depuracause antes de registrar; ante fallo genérico registra la causa para depuración sin cuerpo sensible.
- Los ámbitos exigidos ya existen; no se solicitan alcances nuevos ni se almacenan testigos fuera de `data/tokens.json`.
- Validación de entrada en Business como defensa previa a la llamada externa; lo que rechace Spotify se trata como fallo genérico (UC-001-E2) sin exponer detalles internos.
- Revisión exigible en implementación: búsqueda de patrones de testigo en salida y en `data/app.log`.

## 10. Observabilidad

Registro técnico con Pino en `data/app.log`, sin datos sensibles (RNF-006):

- `info` al iniciar (nombre efectivo, visibilidad solicitada) y al completar con éxito (nombre, visibilidad, descripción efectiva e identificador).
- `warn` ante duplicado (con nombre) y ante cada reintento por 429 (con intento y estado, más espera aplicada).
- `error` ante fallo final (401, 403, 429 agotado, genérico) con causa depurada, sin cuerpo sensible.
- Las cancelaciones del usuario no generan registro.

Business emite la intención con campos estructurados; Data escribe. Presentation no registra directamente.

## 11. Compatibilidad, calidad y restricciones transversales

- RNF-003 (capas): verificable en esta arquitectura (§4 a §6) y en revisión de código posterior: Business no importa Presentation, no depende de CLI, sin entrada o salida directa; Data encapsula efectos; Presentation no concentra reglas críticas.
- RNF-004 (SEA): el diseño no incorpora requisitos de ejecución que impidan el empaquetado futuro como binario único vía Node.js SEA. Sin dependencias nuevas, sin binarios nativos, sin carga dinámica fuera del empaquetado, sin rutas absolutas fuera de `data/` y `downloads/` ya previstas. Base intacta: Node.js 22 o superior, TypeScript estricto, ESM, Biome, Vitest, Pino y SDK de Spotify cuando corresponda.
- RNF-005 (calidad): TypeScript estricto, Biome sin errores, Vitest y TDD posterior (`RED → GREEN → REFACTOR`), complejidad cognitiva menor de 15 por función. La descomposición en predicados puros, caso de uso orquestador y puerta de acceso facilita funciones pequeñas y comprobables.
- RNF-002 (idioma): documentación y mensajes en español estricto; se conservan sin traducir identificadores técnicos, literales aprobados (incluido `flag` en el mensaje de visibilidad por definición humana P-001), rutas, comandos y cabeceras como `Retry-After`.
- Sin dependencias adicionales: solo la base transversal declarada en `REQUIREMENTS.md`.

## 12. Decisiones arquitectónicas (ADR)

No se crea fichero ADR separado. Las decisiones con alternativas reales y consecuencias relevantes quedan registradas aquí de forma concisa. No se documentan detalles triviales de implementación.

### ADR-001: Parametrizar la política de reintento existente para el 429 de creación de playlists

- **Contexto**: la especificación exige ante 429 hasta 3 reintentos, con respeto de `Retry-After` cuando existe y espera de 10 segundos en su ausencia. Existe `withRetry` con `RetryPolicy` en `src/business/retry/retry.ts`, hoy configurado con máximo de 2 reintentos y retroceso exponencial para el flujo de autenticación.
- **Decisión**: reutilizar `withRetry` con una política parametrizada propia de esta funcionalidad (`maxRetries = 3`, `getDelay` que prioriza `Retry-After` y aplica 10 segundos en su ausencia), más un puerto `Espera` inyectable para pruebas. No se duplica el bucle de reintento en el módulo de playlists; no se modifica el comportamiento del flujo de autenticación.
- **Alternativas consideradas y rechazadas**:
  - *Bucle de reintento duplicado en playlists*: permitiría ajuste local inmediato, pero duplicaría lógica de espera y registro, dificultaría pruebas uniformes y rompería la reutilización exigida.
  - *Reutilizar sin parametrizar la política vigente (2 intentos con retroceso exponencial)*: violaría P-003 (3 intentos con `Retry-After` o 10 segundos) y, por tanto, los requisitos.
- **Consecuencias**: cumple P-003 sin duplicación; mantiene un único mecanismo de reintento comprobable; exige extraer `Retry-After` en Data y propagarlo como dato tipado; la espera inyectable permite pruebas sin temporizadores reales y sin riesgo para SEA.

### ADR-002: Puerta de acceso `PlaylistGateway` con crear y listar propias tras interfaces inyectables

- **Contexto**: la creación exige comprobar duplicados solo contra listas propias con paginación externa, y crear después con confirmación explícita. La tentación es llamar al SDK directamente desde Business o desde Presentation.
- **Decisión**: definir en Business el puerto `PlaylistGateway` con `crearPlaylist` y `listarPlaylistsPropias`, implementado únicamente en Data (`playlists-client.ts`) sobre la base `spotify-client.ts`. Business recibe la lista y aplica el predicado exacto; Presentation no accede a red ni a disco.
- **Alternativas consideradas y rechazadas**:
  - *Llamadas directas al SDK desde Business*: acoplaría reglas a HTTP y paginación, impediría dobles de prueba puros y violaría el encapsulamiento de efectos en Data.
  - *Comprobación de duplicados en Presentation o en Data*: concentraría una regla crítica fuera de Business (BR-006) o mezclaría decisión con paginación, y dificultaría la reutilización por una futura GUI.
- **Consecuencias**: Business permanece puro y reutilizable; Data aísla paginación, `Retry-After` y Pino; Presentation coordina menús y confirmaciones; el coste es un fichero adicional de puerta de acceso, compensado por comprobabilidad y reutilización.

No se registran más ADR: el resto de elecciones (nombres de ficheros, extensión de `MESSAGES` y `prompts`, niveles Pino) son detalles de implementación derivados directamente de P-001 a P-007 y de RNF-001 a RNF-006, sin alternativas con consecuencias relevantes.

## 13. Conflictos arquitectónicos

No existe conflicto entre requisitos aprobados y restricciones arquitectónicas:

- Las capas `Presentation → Business → Data` cubren comando directo y menú sin cambiar el comportamiento especificado.
- La reutilización por futuros clientes no CLI se conserva mediante el caso de uso con dependencias inyectadas.
- La compatibilidad SEA se conserva sin dependencias nuevas.
- La seguridad sin secretos en registros se conserva mediante depuración en Data.

Por tanto, no se registra `ARCHITECTURE_CONFLICT` y no se devuelve el control al orquestador por este motivo. Si la implementación descubriera un vacío necesario, se registrará `DISC-XXX` y se seguirá el flujo de descubrimientos sin modificar silenciosamente esta arquitectura ni la especificación.

## 14. Trazabilidad hacia especificación

| Objetivo | Requisitos | Casos de uso | Criterios | Cobertura en esta arquitectura |
|---|---|---|---|---|
| OBJ-001 | RF-001 | UC-001 (principal, A1, E3) | AC-001, AC-002, AC-003, AC-005 | §3 (entradas comando y menú), §4 (módulos por capa), §6.1 a §6.5 (validación, visibilidad, duplicados, confirmación `s/N`) |
| OBJ-001 | RF-002 | UC-001 (principal, A1, E1, E2, E3) | AC-001, AC-004, AC-005 | §6 (mensaje único de éxito y literales exactos de error, menú `1/2/0`, cancelación) |
| OBJ-001 | RNF-001 | UC-001 | AC-004 | §9 (sin secretos en registros, consola ni ficheros; depuración en Data) |
| OBJ-001 | RNF-002 | UC-001 | AC-001 a AC-005 | §11 (español estricto; literales y peticiones verbatim) |
| OBJ-001 | RNF-003 | UC-001 | Verificación en arquitectura | §4, §5, §8 (dirección de dependencias, puertos, reutilización no CLI) |
| OBJ-001 | RNF-004 | UC-001 | Verificación en arquitectura | §11 (sin requisitos que impidan SEA; sin dependencias nuevas) |
| OBJ-001 | RNF-005 | UC-001 | Verificación en implementación | §11 (TypeScript estricto, Biome, Vitest, TDD posterior, complejidad menor de 15) |
| OBJ-001 | RNF-006 | UC-001 | AC-001, AC-004, AC-005 | §10 (Pino en `data/app.log`: `info`, `warn`, `error`; cancelaciones sin registro) |

Las columnas `TASK`, `TC`, `CODE` y `VALIDATION` permanecen pendientes, pues no se crean en esta fase.

## 15. Validez para re-revisión

Esta arquitectura es válida para una nueva revisión de `spec-reviewer` porque:

- Contiene la sección explícita de `Entradas al flujo` con la cadena `Actor → Entry Point → Presentation → Business → Data` para comando directo y opción 4.
- Mantiene `Presentation → Business → Data` con las prohibiciones exigidas (Business sin Presentation, sin CLI, sin entrada o salida directa; Data con Spotify, sistema de ficheros y Pino; Presentation sin reglas críticas).
- Expone casos de uso reutilizables por futuros clientes no CLI y aísla efectos tras `SesionProveedor`, `PlaylistGateway`, `RegistroTecnico` y `Espera`.
- Reutiliza autenticación, reintentos, peticiones, mensajes y registro existentes sin acoplarlos ni alterar su comportamiento.
- Conserva SEA, español estricto, trazabilidad hacia `OBJ/RF/UC/AC` y seguridad sin secretos.
- No crea `TASKS.md`, `TEST_PLAN.md`, código ni pruebas; no declara `IMPLEMENTATION_READY`; no modifica `SPECS.md`, `REQUIREMENTS.md`, `USE_CASES.md`, `ACCEPTANCE_CRITERIA.feature`, `TRACEABILITY.md`, `STATE.md` ni `SPEC_REVIEW.md`.
