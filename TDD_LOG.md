# Registro TDD

Evidencia del ciclo `RED → GREEN → REFACTOR` por tarea. Este registro es evidencia de
implementación, no sustituye a los tests ni a `VALIDATION.md`.

---

## TASK-001 — Contratos de dominio y puertos de creación de playlist vacía

- **Fecha**: 2026-10-08
- **Trazabilidad**: `OBJ-001 → RF-001, RF-002, RNF-003 → UC-001 → AC-001, AC-002, AC-003, AC-004, AC-005 → TASK-001 → TC-001`
- **Estado**: completada (TC-001 en verde; `tsc --noEmit` y Biome sin errores en los ficheros de la tarea)

### TEST creado

- `tests/business/playlists/contratos.test.ts` (4 pruebas de ejecución):
  1. importación de `@/business/playlists/types.js` y `@/business/playlists/puertos.js`;
  2. análisis del código fuente de ambos módulos contra 9 patrones prohibidos
     (`any`, importaciones de Presentation, CLI, Data, Pino, `node:fs`, uso de
     `fetch(`, `process.`, `console.`);
  3. construcción de los 9 desenlaces de `ResultadoCreacion`;
  4. consumo de los cuatro puertos con dobles (`SesionProveedor`, `PlaylistGateway`,
     `RegistroTecnico`, `Espera`) mediante `DependenciasCreacion`.
- `tests/business/playlists/contratos.test-d.ts` (6 pruebas de nivel tipo): aserciones
  `expectTypeOf` sobre solicitud, `Visibilidad`/`EntradaVisibilidad`, `DescripcionEfectiva`,
  unión discriminada de exactamente 9 desenlaces con igualdad por `Extract`, payloads de
  `Exito`/`ErrorValidacion`/`Duplicado`/`FalloInesperado`, firmas de los cuatro puertos y
  consumibilidad del agregado de dependencias.
- Configuración de soporte creada para que `expectTypeOf` se verifique con `tsc`
  (sin ella la comprobación sería vacía):
  - `tsconfig.type-tests.json` (incluye `src/**/*` y `tests/business/playlists/**/*.ts`);
  - `vitest.config.ts`: `typecheck.enabled = true`, `typecheck.include = ['tests/**/*.test-d.ts']`,
    `typecheck.tsconfig = './tsconfig.type-tests.json'`.

### Evidencia RED

`npx vitest run tests/business/playlists` → **exit 1**

- `Test Files 2 failed (2)`, `Tests 1 failed | 5 passed (6)`, `Errors 8`.
- `Error: Cannot find package '@/business/playlists/puertos.js' imported from
  C:/Proyectos/spoty2/tests/business/playlists/contratos.test.ts`
- `TypeCheckError: Cannot find module '@/business/playlists/types.js' or its
  corresponding type declarations.`
- Errores derivados: parámetros implícitos `any` al no existir los tipos.
- Fallo por ausencia del comportamiento esperado (módulo inexistente), no por
  configuración accidental.

### Implementación (GREEN)

- `src/business/playlists/types.ts` (nuevo): `SolicitudCreacion`, `DescripcionEfectiva`,
  `Visibilidad`, `EntradaVisibilidad`, `ResultadoCreacion` con `Exito`, `ErrorValidacion`,
  `Duplicado`, `SinSesion`, `SesionCaducada`, `PermisosInsuficientes`, `LimiteAgotado`,
  `FalloInesperado`, `Cancelado`, más `SesionVigente`, `EntradaCreacionPlaylist` y
  `PlaylistCreada`.
- `src/business/playlists/puertos.ts` (nuevo): `CamposRegistro`, `SesionProveedor`,
  `PlaylistGateway`, `RegistroTecnico`, `Espera` y `DependenciasCreacion`.

#### Decisión de diseño documentada (no es `DISC-XXX`)

El comportamiento está especificado; solo se decidió cómo se codifica:

- `SolicitudCreacion.visibilidad` es de tipo `EntradaVisibilidad = Visibilidad | 'ausente' | 'doble'`.
  BR-005, `ARCHITECTURE.md` §4.1 y §6.3, TASK-008 y TASK-014 exigen que *Business* produzca
  `ErrorValidacion` de visibilidad ante ausencia o doble presencia, mientras §3 de `TASKS.md`
  encomienda a Presentation la *detección sintáctica*. Se resuelve separando **detección**
  (Presentation solo traduce indicadores y no dictamina) de **veredicto** (Business decide
  y devuelve `errorValidacion`). `Visibilidad` conserva exactamente los dos valores aprobados.
- `Exito` incluye además `nombreEfectivo`, `visibilidad` y `descripcionEfectiva`, porque
  `ARCHITECTURE.md` §4.1 establece que esos datos los obtiene Business y viajan como datos
  (solo *identificador* y *enlace* son de Spotify).
- `causa: string` en los cuatro desenlaces fallidos asociados a HTTP, por RNF-006 (registro
  de error final con causa depurada); `SinSesion` y `Cancelado` no llevan campos.
- Los cuatro desenlaces con causa comparten la base no exportada `ConCausa`.

### Evidencia GREEN

`npx vitest run tests/business/playlists` → **exit 0**

- `Test Files 2 passed (2)`, `Tests 10 passed (10)`, `Type Errors no errors`.

**Comprobación de no vacuidad (mutación temporal)**: se cambió
`Espera['esperar']` a `(milisegundos: number) => void` → `npx vitest run
tests/business/playlists` → **exit 1** con
`Tests 1 failed | 9 passed (10)` y
`TypeCheckError: Type '(milisegundos: number) => Promise<void>' does not satisfy the
constraint '"Expected function, Actual function"'` en `contratos.test-d.ts:124`,
señalando exactamente la aserción de puerto. Mutación revertida y suite en verde.

### Refactorización

- Formateo con Biome de los dos ficheros de prueba (ancho de línea).
- `types.ts`: los cuatro desenlaces con `causa` pasan a extender la base no exportada
  `ConCausa`, centralizando la nota de depuración de RNF-001/RNF-006 sin alterar la forma
  de ningún desenlace (forma verificada de nuevo por las aserciones de tipo).

### Validaciones ejecutadas

| Validación | Comando | Resultado |
| --- | --- | --- |
| TC-001 (nivel ejecución y nivel tipo) | `npx vitest run tests/business/playlists` | exit 0 — 10 pruebas en verde |
| Suite completa | `npx vitest run` | exit 0 — 10 ficheros, 91 pruebas, sin errores de tipo |
| Compilación estricta | `npx tsc --noEmit` | exit 0 |
| Biome (ficheros de la tarea) | `npx biome check src/business/playlists tests/business/playlists vitest.config.ts tsconfig.type-tests.json` | exit 0 — 6 ficheros, sin errores |

#### Observación de línea base (preexistente, ajena a TASK-001)

`npx biome check .` a nivel de repositorio devuelve **exit 1** por ficheros que esta tarea
no ha tocado: `package.json` y `.opencode/model-policy.json` (fin de línea CRLF frente a
`lineEnding: "lf"`) y los artefactos generados en `dist/` (`.d.ts` compilados que no están
excluidos de Biome). Los ficheros de TASK-001 y los de configuración modificados pasan
`biome check` sin errores. Se deja constancia para la verificación transversal de Biome
(TASK-020 / TC-028).

---

## TASK-002 — Data — `PlaylistGateway` con crear y listar propias paginadas

- **Fecha**: 2026-10-08
- **Trazabilidad**: `OBJ-001 → RF-001, RNF-001 → UC-001 → AC-001, AC-004, AC-005 → TASK-002 → TC-002, TC-003`
- **Estado**: completada (TC-002 y TC-003 en verde; `tsc --noEmit` y Biome sin errores en los ficheros de la tarea)

### TEST creado

- `tests/data/http/playlists-client.test.ts` (13 pruebas de ejecución con red simulada,
  sin navegación real):
  1. TC-002 — `crearPlaylist` ante 201 devuelve `{ identificador, enlace }`, envía
     `Authorization: Bearer`, `Content-Type: application/json` y cuerpo
     `{ name, description, public }` con el nombre efectivo, la descripción efectiva y
     la visibilidad; el cuerpo serializado no contiene `collaborative`;
  2. TC-002 — visibilidad pública envía `public: true`;
  3. TC-002 — 401 → `ErrorApiSpotify` con `estado = 401` y causa técnica `HTTP 401`
     (sin mensajes de usuario);
  4. TC-002 — 403 → `ErrorApiSpotify` con `estado = 403`;
  5. TC-002 — 500 → error genérico con `causa = 'HTTP 500'` depurada: el cuerpo de la
     respuesta simulado contiene `secreto-cuerpo-500` y no aparece en `causa` ni en
     `message`;
  6. TC-002 — 429 con cabecera `Retry-After: 7` → `reintentoTras = 7`;
  7. TC-002 — 429 sin cabecera → `reintentoTras` ausente (`undefined`);
  8. TC-002 — 201 con cuerpo inesperado (`id` numérico) → error tipado `HTTP 201` sin
     identificador (sin estados ambiguos);
  9. TC-003 — `listarPlaylistsPropias` pagina hasta agotar (2 páginas, 3 llamadas: `/me`,
     página 1 con `next` y página 2 con `next: null`), descarta la lista de otro
     propietario (`owner.id` ajeno) y devuelve `['Viaje 2026', 'Música']` con los
     nombres efectivos propios; todas las llamadas llevan el testigo de sesión;
  10. TC-003 — sin testigo de sesión (doble inyectado a `null`) → `ErrorApiSpotify`
      `estado = 401` con **cero** llamadas de red (sesión encapsulada en Data);
  11. TC-003 — 401 de Spotify en el listado → error tipado `HTTP 401`;
  12. transversal — análisis del código fuente de `src/data/http/playlists-client.ts`
      contra 4 patrones prohibidos (importaciones de Business, de Presentation, `any`
      y `console.`);
  13. transversal — conformidad estructural: el gateway se asigna a
      `PlaylistGateway` (puerto de Business) en tiempo de compilación sin que el
      módulo de Data importe de Business.

### Decisión de diseño documentada (no es `DISC-XXX`)

El comportamiento está especificado (TASK-002, ARCHITECTURE §4.3); solo se decidió cómo
se codifica:

- **Punto de inyección de `fetch` en lugar de `msw`**: `src/data/http/spotify-client.ts`
  existente usa un singleton del SDK sin punto de inyección, por lo que
  `playlists-client.ts` emplea HTTPS directo con `fetch` inyectable
  (`FetchInyectable`), opción expresamente prevista por TASK-002 («punto de inyección
  de `fetch` o con `msw`») y por `ARCHITECTURE.md` §4.3 («SDK o HTTPS»).
- **Conformidad con el puerto sin importar Business**: TASK-002 exige que el módulo no
  importe de Business, mientras ADR-002 exige implementar `PlaylistGateway`. Se resuelve
  con tipado estructural: `GatewayPlaylists` replica la forma del puerto y la prueba
  verifica la asignación `const gateway: PlaylistGateway = crearPlaylistGateway(...)`
  (verificado además por `tsc -p tsconfig.type-tests.json`, que pasa a incluir
  `tests/data/**`).
- **Sesión encapsulada en Data**: `listarPlaylistsPropias()` no admite parámetros (forma
  del puerto); el testigo se obtiene por defecto de `tokens-file.ts`
  (`loadTokens`/`isTokenValid`) y puede inyectarse `obtenerTestigoSesion` en pruebas.
  Sin testigo se lanza `ErrorApiSpotify` 401 sin llamadas de red.
- **Traducción HTTP**: toda respuesta no satisfactoria produce `ErrorApiSpotify` con
  `estado` y `causa = 'HTTP <estado>'` (sin cuerpos); el 429 añade `reintentoTras`
  leído de `Retry-After` en segundos (ausente si la cabecera no existe o no es numérica).
  Un 201 con cuerpo inesperado también produce error tipado, para no devolver datos
  inventados.
- Los desenlaces de dominio (`SesionCaducada`, `PermisosInsuficientes`,
  `LimiteAgotado`, `FalloInesperado`) siguen siendo responsabilidad de Business
  (TASK-007); Data solo aporta `estado` y `causa` depurada.

### Evidencia RED

`npx vitest run tests/data/http/playlists-client.test.ts` → **exit 1**

- `Test Files 1 failed (1)`, `Tests no tests`.
- `Error: Cannot find package '@/data/http/playlists-client.js' imported from
  C:/Proyectos/spoty2/tests/data/http/playlists-client.test.ts`
- Fallo por ausencia del comportamiento esperado (módulo inexistente), no por
  configuración accidental.

### Implementación (GREEN)

- `src/data/http/playlists-client.ts` (nuevo): `EntradaCreacion`, `PlaylistCreada`,
  `GatewayPlaylists`, `FetchInyectable`, `OpcionesGateway`, clase `ErrorApiSpotify`
  (con `estado`, `causa` y `reintentoTras` opcional) y fábrica `crearPlaylistGateway`.
  Internamente: `crearPlaylist` (resuelve usuario vía `/v1/me`, POST a
  `/v1/users/{id}/playlists` con `{ name, description, public }` y nunca
  `collaborative`), `listarPlaylistsPropias` (sesión encapsulada, `/v1/me` y paginación
  de `/v1/me/playlists` siguiendo `next`, filtrando por `owner.id` del usuario
  vigente), `leerReintentoTras`, `errorDeRespuesta` y `solicitar`.
- `tsconfig.type-tests.json`: ampliado el `include` con `tests/data/**` para que la
  conformidad estructural del gateway con el puerto sea verificada por `tsc`.

### Evidencia GREEN

`npx vitest run tests/data/http/playlists-client.test.ts` → **exit 0**

- `Test Files 1 passed (1)`, `Tests 13 passed (13)`, `Type Errors no errors`.

### Refactorización

- `tests/data/http/playlists-client.test.ts`: helper `reglasCrear` simplificado
  (cuerpo de la respuesta extraído a una constante, eliminado el ternario redundante
  `conEstadoCreado ? 201 : 201`) y orden de importaciones corregido según Biome
  (`ErrorApiSpotify`, `type FetchInyectable`, `crearPlaylistGateway`).
- El módulo de producción queda descompuesto desde GREEN en funciones pequeñas
  (`cabecerasAutorizacion`, `leerReintentoTras`, `errorDeRespuesta`, `solicitar`,
  `obtenerUsuario`, `leerPlaylistCreadada`, `nombresPropiosDePagina`) con complejidad
  cognitiva muy por debajo de 15, sin duplicación evitable y sin cambiar resultados.

### Validaciones ejecutadas

| Validación | Comando | Resultado |
| --- | --- | --- |
| TC-002 y TC-003 (más criterios transversales) | `npx vitest run tests/data/http/playlists-client.test.ts` | exit 0 — 13 pruebas en verde |
| Suite completa | `npx vitest run` | exit 0 — 11 ficheros, 104 pruebas, sin errores de tipo |
| Compilación estricta | `npx tsc --noEmit` | exit 0 |
| Conformidad estructural del puerto | `npx tsc -p tsconfig.type-tests.json --noEmit` | exit 0 |
| Biome (ficheros de la tarea) | `npx biome check src/data/http/playlists-client.ts tests/data/http/playlists-client.test.ts tsconfig.type-tests.json` | exit 0 — 3 ficheros, sin errores |

#### Observación de línea base (preexistente, ajena a TASK-002)

Se mantiene la observación registrada en TASK-001: `npx biome check .` a nivel de
repositorio devuelve **exit 1** solo por ficheros no tocados por esta feature
(`package.json`, `.opencode/model-policy.json` y artefactos de `dist/`). Los ficheros de
TASK-002 y la configuración ampliada pasan `biome check` sin errores.

---

## TASK-003 — Data — puerto `RegistroTecnico` sobre Pino en `data/app.log`

- **Fecha**: 2026-10-08
- **Trazabilidad**: `OBJ-001 → RNF-001, RNF-006 → UC-001 → AC-001, AC-004, AC-005 → TASK-003 → TC-004`
- **Estado**: completada (TC-004 en verde con fichero temporal; `tsc --noEmit` y Biome sin errores en los ficheros de la tarea)

### TEST creado

- `tests/data/logging/registro-tecnico.test.ts` (3 pruebas de integración, fichero de
  registro aislado en directorio temporal del sistema operativo mediante `SPOTY_LOG_DIR`
  y `SPOTY_LOG_FILE`, sin escribir en `data/` del repositorio):
  1. TC-004 — crea el registro y comprueba que **no emite eventos por sí mismo** (fichero
     vacío antes de escribir); emite `info` con nombre, visibilidad, descripción
     efectiva e identificador, `advertencia` con nombre, intento y estado, y `error`
     con causa; espera el vaciado del transporte (`flush` más sondeo acotado) y verifica
     **exactamente 3 líneas** JSON con `level` 30/40/50 (`info`/`warn`/`error`) y los
     campos estructurados de cada evento. Depuración en la misma prueba: los campos
     prohibidos aportados (`testigoSesion`, `cabeceras`, `cuerpo`) no aparecen como
     claves en ninguna línea, y el contenido del fichero no contiene `Bearer`,
     `authorization`, `access_token`, `refresh_token` ni los valores secretos sembrados
     (`testigo-super-secreto-12345`, `cabecera-super-secreta-999`,
     `cuerpo-secreto-4242`, `causa-secreta-777`, `refresh-secreto-888`), conservando sí
     la causa técnica `HTTP 500`;
  2. conformidad estructural: `crearRegistroTecnico()` se asigna al puerto
     `RegistroTecnico` de Business en tiempo de compilación sin que el módulo de Data lo
     importe;
  3. análisis del código fuente de `src/data/logging/registro-tecnico.ts` contra 4
     patrones prohibidos (importaciones de Business, de Presentation, `any` y `console.`).

### Decisión de diseño documentada (no es `DISC-XXX`)

El comportamiento está especificado (TASK-003, `ARCHITECTURE.md` §5 y §10, RNF-001 y
RNF-006); solo se decidió cómo se codifica:

- **Conformidad estructural sin importar Business** (precedente de TASK-002): Data
  declara `CamposRegistroPino` y `RegistroTecnicoPino` con la misma forma del puerto y la
  prueba verifica la asignación `const registro: RegistroTecnico = crearRegistroTecnico()`.
- **Reutilización de la base existente**: la escritura usa `getLogger()` de
  `src/data/logging/pino-setup.ts` (sobre `src/data/storage/log-file.ts`), que resuelve
  `data/app.log` o `SPOTY_LOG_FILE`; no se crea infraestructura de log nueva ni se
  modifica el comportamiento de `pino-setup.ts`.
- **Depuración en dos capas antes de escribir** (RNF-001): (1) lista blanca central de
  campos estructurados (`CAMPOS_DE_TEXTO`, `CAMPOS_NUMERICOS`, `VISIBILIDADES`) que
  descarta cualquier otra clave; (2) depuración de textos (`depurarTexto`) que sustituye
  cuerpos JSON completos y objetos JSON embebidos por `[cuerpo omitido]` y los patrones de
  testigo, cabecera de autorización o credencial (`Bearer`, `Authorization`,
  `access_token`, `refresh_token`, `id_token`, JWT) por `[dato omitido]`.
- **Niveles**: `info → info` (30), `advertencia → warn` (40) y `error → error` (50), como
  exige RNF-006.
- **Vaciado asíncrono del transporte de Pino**: riesgo previsto en `TEST_PLAN.md`
  («Pino asíncrono en pruebas»). La prueba fuerza `getLogger().flush()` y espera con
  sondeo acotado (5 s, intervalo 25 ms) hasta observar las 3 líneas, sin relajar ninguna
  aserción de eventos.
- **Limpieza del fichero temporal** en `afterAll` protegida por `try/catch`, porque en
  Windows el transporte de Pino mantiene el fichero abierto hasta cerrar el proceso.

### Evidencia RED

`npx vitest run tests/data/logging/registro-tecnico.test.ts` → **exit 1**

- `Test Files 1 failed (1)`, `Tests no tests`.
- `Error: Cannot find package '@/data/logging/registro-tecnico.js' imported from
  C:/Proyectos/spoty2/tests/data/logging/registro-tecnico.test.ts`
- Fallo por ausencia del comportamiento esperado (módulo inexistente), no por error de
  configuración accidental.

### Implementación (GREEN)

- `src/data/logging/registro-tecnico.ts` (nuevo): tipos `VisibilidadRegistro`,
  `CamposRegistroPino`, `RegistroTecnicoPino` y `NivelRegistro`; constantes centralizadas
  `CAMPOS_DE_TEXTO`, `CAMPOS_NUMERICOS`, `VISIBILIDADES`, `MARCA_DATO_OMITIDO`,
  `MARCA_CUERPO_OMITIDO`, `PATRONES_SECRETOS` y `PATRON_CUERPO_JSON`; funciones
  `esJsonCompleto`, `depurarTexto`, `depurarCampos`, `escribir` y fábrica
  `crearRegistroTecnico` (no escribe nada hasta que Business invoca `info`,
  `advertencia` o `error`).

### Evidencia GREEN

`npx vitest run tests/data/logging/registro-tecnico.test.ts` → **exit 0**

- `Test Files 1 passed (1)`, `Tests 3 passed (3)`, `Type Errors no errors`.

**Comprobación de no vacuidad (mutaciones temporales, revertidas después)**:

1. `escribir` sin depuración (campos y mensaje en crudo) → **exit 1** con
   `AssertionError: expected [ 'testigoSesion', 'cabeceras', …(1) ] to deeply equal []`
   (`Tests 1 failed | 2 passed`): se activa la lista blanca de campos.
2. `depurarTexto` convertido en función identidad → **exit 1** con
   `AssertionError: expected '{"level":30,…' not to match /bearer/i`
   (`Tests 1 failed | 2 passed`): se activa la depuración de textos.
3. `advertencia` escrito en el nivel `info` → **exit 1** con
   `AssertionError: expected { level: 30, …(7) } to match object { level: 40, …(4) }`
   (`Tests 1 failed | 2 passed`): se activa la aserción de niveles.

Mutaciones revertidas y suite en verde de nuevo.

### Refactorización

- `depurarCampos` pasa a aceptar el parámetro por defecto
  (`campos: CamposRegistroPino = {}`), eliminando la rama de retorno anticipado y
  reduciendo su complejidad sin cambiar la salida.
- La lista de campos depurados queda centralizada en las constantes `CAMPOS_DE_TEXTO`,
  `CAMPOS_NUMERICOS`, `VISIBILIDADES` y `PATRONES_SECRETOS`, según prevé el TDD de la
  tarea («centralizar la lista de campos depurados sin cambiar la salida»).
- Verificación tras el refactor: TC-004 en verde con las mismas 3 pruebas.

### Validaciones ejecutadas

| Validación | Comando | Resultado |
| --- | --- | --- |
| TC-004 (integración, fichero temporal) | `npx vitest run tests/data/logging/registro-tecnico.test.ts` | exit 0 — 3 pruebas en verde |
| Suite completa | `npx vitest run` | exit 0 — 12 ficheros, 107 pruebas, sin errores de tipo (antes 11/104) |
| Compilación estricta | `npx tsc --noEmit` | exit 0 |
| Conformidad estructural del puerto | `npx tsc -p tsconfig.type-tests.json --noEmit` | exit 0 |
| Biome (ficheros de la tarea) | `npx biome check src/data/logging/registro-tecnico.ts tests/data/logging/registro-tecnico.test.ts` | exit 0 — 2 ficheros, sin errores |
| Aislamiento de `data/` | `git check-ignore -v data/app.log` y fecha de `data/app.log` | `data/` ignorado y `data/app.log` sin escribir (mtime 2026-10-06) durante la prueba |

#### Observación de línea base (preexistente, ajena a TASK-003)

- Se mantiene la observación de TASK-001 y TASK-002: `npx biome check .` a nivel de
  repositorio devuelve **exit 1** solo por ficheros no tocados por esta feature
  (`package.json`, `.opencode/model-policy.json` y artefactos de `dist/`), con 32 errores
  preexistentes; ningún fichero de TASK-003 aparece en la salida.
- **Observación nueva para el orquestador (no bloqueante, fuera del alcance de
  TASK-003)**: la regla `.gitignore:10` `data/`, concebida para el directorio de
  registros, ignora también `src/data/` y `tests/data/` (`git check-ignore -v` lo
  confirma), de modo que los entregables de TASK-002 y TASK-003 en capa Data no están
  bajo seguimiento de Git. No afecta a los criterios de finalización de TASK-003 (TC-004,
  `tsc` y Biome en verde). Corresponde al orquestador decidir si abre `DISC-XXX` o una
  solicitud de cambio para `.gitignore`; esta tarea no modifica configuración del
  repositorio.

---

## TASK-004 — Política de reintento ante 429 parametrizable (ADR-001)

- **Fecha**: 2026-10-08
- **Trazabilidad**: `OBJ-001 → RF-002, RNF-005, RNF-006 → UC-001-E2 → AC-004 → TASK-004 → TC-005, TC-006`
- **Estado**: completada (TC-005 y TC-006 en verde; `tsc --noEmit` y Biome sin errores en los ficheros de la tarea)

### TEST creado

- `tests/business/playlists/politica-reintento.test.ts` (9 pruebas de unidad, **TC-006**):
  1. `maxRetries = 3` con `shouldRetry` verdadero en los intentos 0, 1 y 2 y falso en el 3 (hasta 4 intentos totales);
  2. `shouldRetry` falso para 400, 401, 403 y 500 (sin reintentos indebidos);
  3. `getDelay`: `reintentoTras * 1000` cuando es mayor que 0 (7 → 7000, 1 → 1000) y `10000` cuando es 0, ausente o negativo, leyendo además `reintentoTras` del propio error (5 → 5000);
  4. `matchesError` estructural: acepta `{ estado: 429 }` con o sin `reintentoTras` y rechaza `{ estado: '429' }`, `Error` genérico y `null`;
  5. **429 persistente** con `Espera` y `RegistroTecnico` inyectados: 4 llamadas a la operación, retardos `[7000, 7000, 7000]`, exactamente 3 `advertencia` con `intento` 1, 2 y 3 y `estado` 429, y **cero** `error` (el error final pertenece al caso de uso, TASK-009);
  6. sin `Retry-After`: retardos `[10000, 10000, 10000]`;
  7. **sin temporizadores reales**: espera declarada por `Espera` = 30000 ms y tiempo transcurrido < 1000 ms;
  8. recuperación tras 2 fallos: resultado `creada`, 3 llamadas, retardos `[2000, 10000]` y 2 advertencias;
  9. 401: 1 sola llamada, cero esperas y cero advertencias.
- **TC-005 (regresión)**: no se crea ningún fichero de prueba nuevo y **no se modifica**
  `tests/business/retry/retry.test.ts` (15 pruebas). Verificación: `git status --porcelain
  tests/business/retry/retry.test.ts` sin salida y `git diff --name-only` sin ese fichero.

### Evidencia RED

`npx vitest run tests/business/playlists/politica-reintento.test.ts` → **exit 1**

- `Test Files 1 failed (1)`, `Tests no tests`.
- `Error: Cannot find package '@/business/playlists/politica-reintento.js' imported from
  C:/Proyectos/spoty2/tests/business/playlists/politica-reintento.test.ts`

`npx tsc -p tsconfig.type-tests.json --noEmit` → **exit 2**

- `TS2307: Cannot find module '@/business/playlists/politica-reintento.js'`
- `TS2554: Expected 1-3 arguments, but got 4` (×5): `withRetry` aún no acepta el parámetro de inyectables.

Fallo por ausencia del comportamiento esperado (módulo y parámetro inexistentes), no por
error de configuración accidental.

### Implementación (GREEN)

- `src/business/retry/retry.ts` (parametrizado):
  - `RetryPolicy<E = AuthError>` con los miembros existentes intactos más los opcionales
    `matchesError` (guarda tipada del dominio de errores), `getRetryAfter` y `getStatus`;
  - `InyectablesRetry` con los puertos `Espera` y `RegistroTecnico` de
    `src/business/playlists/puertos.ts` (importación de tipos, sin dependencia de Data);
  - `withRetry(operation, policy?, context?, inyectables?)`: los tres primeros argumentos
    conservan posición y semántica (los llamados de `auth/flow.ts` y de la suite TC-005 no cambian);
  - descomposición: `pinoReporter` (ruta por defecto idéntica a la anterior), `portReporter`
    (advertencia por reintento), `esErrorDePolitica`, `bucleConReintento` y
    `esperaPredefinida` (adaptador del temporizador que sustituye a `sleep`).
- `src/business/playlists/politica-reintento.ts` (nuevo): `ErrorConEstado` (estructural),
  `esErrorConEstado` y `politicaReintento429` con `maxRetries = 3`, `shouldRetry` solo para
  estado 429, `getDelay` (`reintentoTras * 1000` o `10000`), `getRetryAfter` y `getStatus`.

#### Decisión de diseño documentada (no es `DISC-XXX`)

El comportamiento está especificado (TASK-004, ADR-001, P-003, RNF-006); solo se decidió
cómo se codifica:

- **Sin importación de Data**: el error se describe estructuralmente (`ErrorConEstado`), de
  modo que `ErrorApiSpotify` de Data satisface la política sin que Business importe de Data (RNF-003).
- **La ruta con puerto solo emite `advertencia` por reintento**: el `error` final lo emite el
  caso de uso al clasificar el desenlace (TASK-007/TASK-009), evitando eventos duplicados.
- **La espera aplicada viaja en el mensaje** de la advertencia
  (`Reintento N programado; espera de X ms`) porque `CamposRegistro` (contrato aprobado en
  TASK-001) no incluye ese campo: no se modifica el contrato aprobado.
- **`defaultRetryPolicy as unknown as RetryPolicy<E>`**: al no aportar política, `E` se
  resuelve como `AuthError`; el doble cast es necesario porque un tipo genérico sin
  restricción no es comparable con `RetryPolicy<AuthError>` (sin `any`).
- **Ruta por defecto intacta**: `pinoReporter` conserva mensajes, campos y orden de los
  eventos del flujo de autenticación y solo se construye cuando no se inyecta `registro`
  (la suite TC-005 no se ha tocado).

### Evidencia GREEN

`npx vitest run tests/business/playlists/politica-reintento.test.ts tests/business/retry/retry.test.ts` → **exit 0**

- `Test Files 2 passed (2)`, `Tests 24 passed (24)` (9 nuevas de TC-006 + 15 de regresión TC-005), `Type Errors no errors`.

**Comprobación de no vacuidad (mutaciones temporales, revertidas después)**:

1. `MAX_REINTENTOS` 3 → 2 → **exit 1** con `Tests 4 failed | 5 passed (9)`.
2. `registro.advertencia` → `registro.info` en `portReporter` → **exit 1** con `Tests 2 failed | 7 passed (9)`.
3. Ignorar `inyectables.espera` (usar siempre `esperaPredefinida`) → **exit 1** con
   `Tests 4 failed | 5 passed (9)` tras 40 s de esperas reales (temporizadores reales detectados).
4. `MAX_RETRIES` 2 → 3 (ruta de autenticación) → **exit 1** sobre `tests/business/retry/retry.test.ts`
   con `Tests 2 failed | 13 passed (15)`: TC-005 sigue vigilando la regresión.

Mutaciones revertidas y suite en verde de nuevo.

### Refactorización

- Corrección de la errata «polítias» → «políticas» en la documentación de `RetryPolicy`.
- Revisión de duplicación: la espera queda en un único punto (`bucleConReintento` con
  `esperaPredefinida` como adaptador) y la emisión de eventos se resuelve en dos reporters
  pequeños (`pinoReporter` y `portReporter`) sin duplicar la lógica de reintento.
- Verificación tras el refactor: TC-005 y TC-006 en verde con las mismas 9 + 15 pruebas.

### Validaciones ejecutadas

| Validación | Comando | Resultado |
| --- | --- | --- |
| TC-006 (unidad, sin temporizadores reales) | `npx vitest run tests/business/playlists/politica-reintento.test.ts` | exit 0 — 9 pruebas en verde |
| TC-005 (regresión sin modificar aserciones) | `npx vitest run tests/business/retry/retry.test.ts` | exit 0 — 15 pruebas en verde; fichero sin modificar (`git status` vacío) |
| Suite completa | `npx vitest run` | exit 0 — 13 ficheros, 116 pruebas, sin errores de tipo (antes 12/107) |
| Compilación estricta | `npx tsc --noEmit` | exit 0 |
| Tipos de la prueba nueva | `npx tsc -p tsconfig.type-tests.json --noEmit` | exit 0 |
| Biome (ficheros de la tarea) | `npx biome check src/business/retry/retry.ts src/business/playlists/politica-reintento.ts tests/business/playlists/politica-reintento.test.ts` | exit 0 — 3 ficheros, sin errores |
| Sin esperas reales en pruebas | Aserción TC-006 «espera declarada 30000 ms < transcurrido 1000 ms» y mutación 3 | Sin `setTimeout` propio en la ruta con puertos inyectados |

#### Observación de línea base (preexistente, ajena a TASK-004)

Se mantiene la observación de TASK-001 a TASK-003: `npx biome check .` a nivel de repositorio
devuelve salida con errores solo por ficheros no tocados por esta feature (`dist/`,
`package.json` y `.opencode/model-policy.json`); una búsqueda explícita de
`politica-reintento` y `business/retry/retry.ts` en esa salida no devuelve coincidencias, y
los tres ficheros de TASK-004 pasan `biome check` sin errores.

---

## TASK-005 — Business — predicados puros de validación de nombre, descripción y visibilidad

- **Fecha**: 2026-10-08
- **Trazabilidad**: `OBJ-001 → RF-001 → UC-001, UC-001-E3 → AC-002, AC-005 → TASK-005 → TC-007`
- **Estado**: completada (TC-007 en verde; `tsc --noEmit`, pruebas de nivel tipo y Biome sin errores en los ficheros de la tarea)

### TEST creado

- `tests/business/playlists/validacion.test.ts` (10 pruebas de unidad, **TC-007**):
  1. recorte de espacios en extremos sin alterar el interior (`'  Viaje 2026  '` → `'Viaje 2026'`,
     `'Viaje  2026'` intacto, `'   '` → `''`);
  2. `esLongitudValida` acepta de 3 a 100 caracteres visibles tras recorte (3, 100, `'  abc  '`);
  3. `esLongitudValida` rechaza vacío, solo espacios, nombre ausente (`undefined`), 2 caracteres
     (`'ab'`, `'  ab  '`) y 101;
  4. medición de caracteres visibles: `'😀😀'` rechazado (2 puntos de código) y `'😀😀😀'` aceptado
     (una mitad suelta de surrogate no es un carácter visible);
  5. descripción vacía, solo espacios o ausente → `"Playlist sin descripción"`;
  6. descripción aportada no vacía → valor resuelto (`'Carretera'`, `'  Carretera  '` recortado);
  7. visibilidad `'publica'` y `'privada'` aceptadas como valores únicos;
  8. visibilidad `'ausente'` y `'doble'` → `ErrorValidacion` con `campo: 'visibilidad'`;
  9. transversal (pureza y capas): análisis del código fuente de
     `src/business/playlists/validacion.ts` contra 11 patrones prohibidos (`any`,
     importaciones de Presentation, CLI, Data y Pino, `node:fs`, `fetch(`, `process.`,
     `console.`, literal `'colaborativa'` y `collaborative`);
  10. determinismo: la misma entrada produce el mismo resultado en repeticiones sucesivas.
- `tests/business/playlists/validacion.test-d.ts` (3 pruebas de nivel tipo, TC-007):
  1. `Extract<EntradaVisibilidad, 'colaborativa'>` es `never` y `'colaborativa'` no es
     asignable a `EntradaVisibilidad` (modalidad colaborativa no representable, BR-005);
  2. `resolverVisibilidad` devuelve `Visibilidad | ErrorValidacion` para entrada válida y para
     `ausente`;
  3. firmas de los predicados: `esLongitudValida(nombre: string | undefined) => boolean`,
     `recortarNombre(nombre: string) => string` y
     `resolverDescripcionEfectiva(descripcion?: string) => string` (sin `any`).

### Evidencia RED

`npx vitest run tests/business/playlists/validacion.test.ts` → **exit 1**

- `Test Files 1 failed (1)`, `Tests no tests`.
- `Error: Cannot find package '@/business/playlists/validacion.js' imported from
  C:/Proyectos/spoty2/tests/business/playlists/validacion.test.ts`

`npx tsc -p tsconfig.type-tests.json --noEmit` → **exit 2**

- `TS2307: Cannot find module '@/business/playlists/validacion.js'` (×2, fichero de ejecución y
  fichero de nivel tipo).

Fallo por ausencia del comportamiento esperado (módulo inexistente), no por error de
configuración accidental: `vitest.config.ts` y `tsconfig.type-tests.json` no se modificaron.

### Implementación (GREEN)

- `src/business/playlists/validacion.ts` (nuevo): constantes `LONGITUD_MINIMA` (3),
  `LONGITUD_MAXIMA` (100) y `DESCRIPCION_POR_DEFECTO` (`"Playlist sin descripción"`), más las
  cuatro funciones puras previstas en `ARCHITECTURE.md` §4.2:
  `recortarNombre`, `esLongitudValida`, `resolverDescripcionEfectiva` y `resolverVisibilidad`.
  Sin red, sin disco, sin terminal; solo importa tipos de `./types.js` (contrato de TASK-001,
  sin modificar).

#### Decisión de diseño documentada (no es `DISC-XXX`)

El comportamiento está especificado (RF-001, RNF-005, UC-001-E3, AC-002, AC-005, BR-004,
BR-005, P-004); solo se decidió cómo se codifica:

- **`esLongitudValida(nombre: string | undefined)`**: el predicado acepta la ausencia y la
  rechaza expresamente (equivale a cadena vacía, P-004). No se modifica
  `SolicitudCreacion.nombre: string` (contrato aprobado de TASK-001).
- **`resolverVisibilidad(entrada): Visibilidad | ErrorValidacion`**: devuelve la visibilidad
  resuelta o directamente el desenlace `ErrorValidacion` de visibilidad, de modo que el caso de
  uso (TASK-008) estrecha por `typeof x === 'string'` sin excepciones ni estados ambiguos
  (BR-003). `ErrorValidacion` es un desenlace tipado de `types.ts`, no una excepción.
- **Caracteres visibles = puntos de código** (`[...texto].length`): una mitad suelta de
  surrogate no es un carácter visible. Sin librería nueva ni `Intl.Segmenter` (RNF-004, SEA).
  Lo que rechace Spotify sigue tratándose como fallo genérico (UC-001-E2).
- **Recorte también de la descripción aportada**: coherencia con el recorte único de espacios en
  extremos; ningún literal aprobado incluye espacios extremos.
- **`DESCRIPCION_POR_DEFECTO` interna**: Presentation emplea su propio literal aprobado
  (TASK-011); Business resuelve el valor efectivo.

### Evidencia GREEN

`npx vitest run tests/business/playlists/validacion.test.ts` → **exit 0**

- `Test Files 1 passed (1)`, `Tests 10 passed (10)`, `Type Errors no errors`.
- Corrección mínima previa al verde: el propio comentario del módulo contenía la palabra
  prohibida `any`, que el patrón de la prueba detecta; se reescribió el comentario («no declara
  tipos inseguros») sin tocar comportamiento.

**Comprobación de no vacuidad (mutaciones temporales, revertidas después)**:

1. `resolverDescripcionEfectiva` sin la rama por defecto (`return texto;`) → **exit 1** con
   `Tests 1 failed | 9 passed (10)` y `AssertionError: expected '' to be
   'Playlist sin descripción'`.
2. `resolverVisibilidad` sin la rama de ausencia (`if (entrada === 'doble')`) → **exit 1** con
   `Tests 1 failed | 9 passed (10)` y `AssertionError: expected 'ausente' to deeply equal
   { resultado: 'errorValidacion', campo: 'visibilidad' }`.
3. `LONGITUD_MINIMA` 3 → 1 → **exit 1** con `Tests 2 failed | 8 passed (10)` (aserciones `'ab'`
   y `'😀😀'`).

Mutaciones revertidas y suite en verde de nuevo.

### Refactorización

- **Unificación del recorte** (previsto por el TDD de la tarea): el recorte queda en una única
  función privada `recortar(texto: string | undefined)`, usada por `recortarNombre`,
  `esLongitudValida` y `resolverDescripcionEfectiva`, eliminando las tres llamadas duplicadas a
  `trim()`.
- Extracción de `contarVisibles` (puntos de código) y de las constantes `LONGITUD_MINIMA`,
  `LONGITUD_MAXIMA` y `DESCRIPCION_POR_DEFECTO`; comentarios de trazabilidad corregidos
  (el de `recortarNombre` describía la ausencia, ahora documentada en `recortar`).
- Verificación tras el refactor: TC-007 en verde con las mismas 10 pruebas de ejecución y las
  mismas 3 de nivel tipo.

### Validaciones ejecutadas

| Validación | Comando | Resultado |
| --- | --- | --- |
| TC-007 (unidad + nivel tipo) | `npx vitest run tests/business/playlists/validacion.test.ts` | exit 0 — 10 pruebas en verde |
| Carpetas de Business de la feature | `npx vitest run tests/business/playlists` | exit 0 — 5 ficheros, 32 pruebas |
| Suite completa | `npx vitest run` | exit 0 — 15 ficheros, 129 pruebas, sin errores de tipo (antes 13/116; +10 de ejecución y +3 de nivel tipo) |
| Compilación estricta | `npx tsc --noEmit` | exit 0 |
| Nivel tipo | `npx tsc -p tsconfig.type-tests.json --noEmit` | exit 0 |
| Biome (ficheros de la tarea) | `npx biome check src/business/playlists/validacion.ts tests/business/playlists/validacion.test.ts tests/business/playlists/validacion.test-d.ts` | exit 0 — 3 ficheros, sin errores |
| Complejidad cognitiva < 15 | Regla `complexity/noExcessiveCognitiveComplexity` de Biome en `error` sin incidentes en los 3 ficheros; inspección manual: la función más compleja (`resolverVisibilidad`) tiene 1 decisión condicional | Cumple |
| Sin red, disco ni terminal | Prueba TC-007 «pureza y capas»: 11 patrones prohibidos sin coincidencias en la fuente | Cumple |
| Sin cambios en contratos de TASK-001 | `git status --porcelain src/business/playlists/types.ts src/business/playlists/puertos.ts` | Sin salida (ficheros intactos) |

#### Observación de línea base y observación nueva (preexistentes o ajenas a TASK-005)

- Se mantiene la observación de TASK-001 a TASK-004: `npx biome check .` a nivel de repositorio
  devuelve errores solo por ficheros no tocados por esta feature (`dist/`, `package.json`,
  `.opencode/model-policy.json`); los 3 ficheros de TASK-005 pasan `biome check` sin errores.
- **Observación nueva para el orquestador (no bloqueante, fuera del alcance de TASK-005)**:
  `npx vitest run --coverage` falla con `MISSING DEPENDENCY Cannot find dependency
  '@vitest/coverage-v8'`, por lo que la cobertura mínima del 80 % de `src/business/**` no es
  ejecutable hoy sin incorporar esa dependencia de desarrollo. No afecta a los criterios de
  finalización de TASK-005 (TC-007, `tsc`, nivel tipo y Biome en verde). Corresponde al
  orquestador decidir si abre `DISC-XXX` o justifica la dependencia antes de TASK-020/TC-028;
  esta tarea no incorpora dependencias.
- No se abre ningún `DISC-XXX`: no falta nada para completar TASK-005.

---

## TASK-006 — Business — predicado de duplicado contra listas propias

- **Fecha**: 2026-10-08
- **Trazabilidad**: `OBJ-001 → RF-001 → UC-001-A1 → AC-005 → TASK-006 → TC-008`
- **Estado**: completada (TC-008 en verde; `tsc --noEmit`, pruebas de nivel tipo y Biome sin errores en los ficheros de la tarea)

### TEST creado

- `tests/business/playlists/duplicados.test.ts` (9 pruebas de unidad, **TC-008**):
  1. coincidencia tras recorte de espacios en extremos: `'Viaje 2026 '` frente a `'Viaje 2026'`,
     `' Viaje 2026'`, `'  Viaje 2026  '` y recorte también del nombre propio (`'  Viaje 2026  '` en
     la lista), más presencia en posiciones no iniciales de la lista;
  2. ausencia en la lista: lista vacía y lista sin el nombre → `false`;
  3. sensibilidad a mayúsculas: `Viaje`/`viaje`, `viaje`/`Viaje`, `VIAJE 2026`/`viaje 2026` y
     `viaje 2026`/`VIAJE 2026` → `false` en los cuatro sentidos;
  4. comparación exacta, no parcial ni difusa: contención (`Viaje`/`Viaje 2026`),
     espacios interiores distintos (`Viaje  2026`/`Viaje 2026`) y nombre sin espacio
     (`Viaje2026`/`Viaje 2026`) → `false`;
  5. ajenas homónimas no cuentan: solo puede haber coincidencia con un nombre presente en las
     propias recibidas (la homónima ajena no llega a la función porque Data filtra antes,
     TASK-002) y con lista vacía nunca hay duplicado;
  6. transversal (pureza y capas): análisis del código fuente de
     `src/business/playlists/validacion.ts` contra 9 patrones prohibidos (`any`, importaciones de
     Presentation, CLI, Data y Pino, `node:fs`, `fetch(`, `process.`, `console.`);
  7. determinismo: la misma entrada produce el mismo resultado en repeticiones sucesivas;
  8. la función no muta la lista de propias recibida.

El fichero de TC-007 (`tests/business/playlists/validacion.test.ts`) no se modifica: conserva su
rol de regresión de TASK-005 sobre el mismo módulo `validacion.ts`, que TASK-006 extiende sin
duplicar.

### Evidencia RED

`npx vitest run tests/business/playlists/duplicados.test.ts` → **exit 1**

- `Test Files 1 failed (1)`, `Tests 8 failed | 1 passed (9)`.
- `TypeError: esDuplicadoPropio is not a function` en las 8 pruebas de comportamiento
  (el módulo existe por TASK-005, pero el predicado no).
- La prueba que pasaba en RED es la comprobación de pureza de la fuente, que no depende del
  predicado; las 8 de comportamiento sí fallan por ausencia del comportamiento esperado.

`npx tsc -p tsconfig.type-tests.json --noEmit` → **exit 2**

- `TS2305: Module '"@/business/playlists/validacion.js"' has no exported member
  'esDuplicadoPropio'.`

Fallo por ausencia del comportamiento esperado (export inexistente), no por error de
configuración accidental: `vitest.config.ts` y `tsconfig.type-tests.json` no se modificaron.

### Implementación (GREEN)

- `src/business/playlists/validacion.ts` (extensión del fichero de TASK-005, sin duplicar):
  nueva función pública
  `esDuplicadoPropio(nombreEfectivo: string, propias: readonly string[]): boolean`,
  que reutiliza la función privada `recortar` ya existente y compara con `===` (exacta y sensible
  a mayúsculas) sobre las listas propias recibidas. Sin red, sin disco, sin terminal y sin mutar
  la lista; comentario de cabecera del módulo ampliado con la trazabilidad de TASK-006/TC-008.

#### Decisión de diseño documentada (no es `DISC-XXX`)

El comportamiento está especificado (RF-001, RNF-005, UC-001-A1, AC-005, BR-006, P-004,
`ARCHITECTURE.md` §6.5); solo se decidió cómo se codifica:

- **`propias: readonly string[]`**: acepta `string[]` (forma del puerto
  `PlaylistGateway.listarPlaylistsPropias`, TASK-001) sin permitir la mutación desde el predicado.
- **Sin filtro de propietario en Business**: el predicado no discrimina propias de ajenas porque
  el filtrado es responsabilidad de Data (TASK-002/TC-003); por eso las ajenas homónimas no
  cuentan, criterio verificado con la aserción 5.
- **Recorte de ambos lados de la comparación**: se reutiliza `recortar` (recorte único de
  TASK-005) tanto para el nombre efectivo como para cada propia, sin añadir una segunda rutina de
  recorte.
- **Sin guardia para nombre vacío**: P-004 hace que el predicado solo se invoque con un nombre ya
  validado de 3-100 caracteres (TASK-008); añadir una rama adicional sería comportamiento no
  pedido. La aserción de lista vacía cubre el único supuesto análogo definido.

### Evidencia GREEN

`npx vitest run tests/business/playlists/duplicados.test.ts tests/business/playlists/validacion.test.ts` → **exit 0**

- `Test Files 2 passed (2)`, `Tests 19 passed (19)` (9 nuevas de TC-008 + 10 de regresión TC-007),
  `Type Errors no errors`.

**Comprobación de no vacuidad (mutaciones temporales, revertidas después)**:

1. Comparación insensible a mayúsculas (`.toLowerCase()` en ambos lados) → **exit 1** con
   `Tests 1 failed | 8 passed (9)` y `AssertionError: expected true to be false` en «Viaje no
   coincide con viaje en ninguna dirección».
2. Sin recorte de la propia (`propia === objetivo`) → **exit 1** con `Tests 1 failed | 8 passed (9)`
   y `AssertionError: expected false to be true` en «coincide cuando tras recortar los nombres son
   exactamente iguales» (aserción `'Viaje 2026'` frente a `'  Viaje 2026  '`).

Mutaciones revertidas y suite en verde de nuevo.

### Refactorización

- Formateo con Biome de los dos ficheros (firma de `esDuplicadoPropio` a una línea y llamada de
  determinismo a una línea), sin cambio de comportamiento.
- Revisión de duplicación: no se añade ninguna rutina de recorte nueva (reutiliza `recortar`) y
  no se modifica ninguna función de TASK-005. La lista de patrones prohibidos de la prueba es
  deliberadamente local a TC-008 para no tocar el fichero de regresión TC-007 de TASK-005.
- Verificación tras el refactor: TC-007 y TC-008 en verde con las mismas 10 + 9 pruebas.

### Validaciones ejecutadas

| Validación | Comando | Resultado |
| --- | --- | --- |
| TC-008 (unidad) | `npx vitest run tests/business/playlists/duplicados.test.ts` | exit 0 — 9 pruebas en verde |
| TC-007 (regresión de TASK-005 sobre el módulo extendido) | `npx vitest run tests/business/playlists/validacion.test.ts` | exit 0 — 10 pruebas en verde |
| Carpetas de Business de la feature | `npx vitest run tests/business/playlists` | exit 0 — 6 ficheros, 41 pruebas |
| Suite completa | `npx vitest run` | exit 0 — 16 ficheros, 138 pruebas, sin errores de tipo (antes 15/129; +9 de TC-008) |
| Compilación estricta | `npx tsc --noEmit` | exit 0 |
| Nivel tipo | `npx tsc -p tsconfig.type-tests.json --noEmit` | exit 0 |
| Biome (ficheros de la tarea) | `npx biome check src/business/playlists/validacion.ts tests/business/playlists/duplicados.test.ts` | exit 0 — 2 ficheros, sin errores |
| Complejidad cognitiva < 15 | Regla `complexity/noExcessiveCognitiveComplexity` de Biome en `error` sin incidentes; `esDuplicadoPropio` tiene 1 decisión implícita en `some` | Cumple |
| Sin red, disco ni terminal | Prueba TC-008 «pureza y capas»: 9 patrones prohibidos sin coincidencias en la fuente | Cumple |
| Contratos de TASK-001 intactos | `git status --porcelain` sin cambios nuevos en `types.ts` ni `puertos.ts` | Sin salida |
| Sin cambios en la prueba de TC-007 | `tests/business/playlists/validacion.test.ts` no editado en esta tarea | Intacto |

#### Observación de línea base (preexistente, ajena a TASK-006)

Se mantienen las observaciones de TASK-001 a TASK-005: `npx biome check .` a nivel de repositorio
devuelve errores solo por ficheros no tocados por esta feature (`dist/`, `package.json`,
`.opencode/model-policy.json`) y `npx vitest run --coverage` sigue sin el dependiente
`@vitest/coverage-v8` (pendiente de decisión del orquestador en TASK-020/TC-028). Los 2 ficheros
de TASK-006 pasan `biome check` sin errores. No se abre ningún `DISC-XXX`: no falta nada para
completar TASK-006.

---

## TASK-007 — Business — clasificación de errores de Data en resultados de dominio

- **Fecha**: 2026-10-08
- **Trazabilidad**: `OBJ-001 → RF-002, RNF-001 → UC-001-E1, UC-001-E2 → AC-004 → TASK-007 → TC-009`
  (los casos de uso E1 y E2 son los declarados en el campo «Casos de uso» de TASK-007)
- **Estado**: completada (TC-009 en verde; `tsc --noEmit`, nivel tipo y Biome sin errores en los
  ficheros de la tarea)

### TEST creado

- `tests/business/playlists/errores.test.ts` (10 pruebas de unidad, **TC-009**):
  1. ausencia de sesión (`null` o `undefined`) → `sinSesion` (UC-001-E1);
  2. `401` → `sesionCaducada` con causa;
  3. `403` → `permisosInsuficientes` con causa;
  4. `429` persistente → `limiteAgotado` con `reintentoTras` conservado (`7`) y, sin dato de
     `Retry-After`, desenlace sin la clave `reintentoTras`;
  5. resto de estados (400, 404, 500, 502, 503) y errores no estructurados (`Error` común,
     cadena, objeto sin `estado`, número) → `falloInesperado` con causa técnica;
  6. causa depurada: testigo `Bearer`, cabecera `authorization`, `access_token`, cookie, cuerpo
     JSON completo y fragmento JSON → sin secretos, sin cuerpos, sin cabeceras y con tope de
     longitud, sin perder el desenlace correcto (401 con testigo sigue produciendo
     `sesionCaducada`);
  7. ninguna rama produce los 5 literales de error de RF-002 ni los declara en el código fuente
     (los literales son de Presentation);
  8. pureza y capas: análisis de la fuente de `src/business/playlists/errores.ts` contra 10
     patrones prohibidos (`any`, importaciones de Presentation, CLI, Data y Pino, `node:fs`,
     `fetch(`, `process.`, `console.` y `readline`);
  9. determinismo y no mutación de la entrada en repeticiones sucesivas;
  10. los cinco desenlaces clasificados encajan en `ResultadoCreacion` de TASK-001 (subtipo, sin
      modificar ese contrato).

### Evidencia RED

`npx vitest run tests/business/playlists/errores.test.ts` → **exit 1**

- `Test Files 1 failed (1)`, `Tests no tests`.
- `Error: Cannot find package '@/business/playlists/errores.js' imported from
  C:/Proyectos/spoty2/tests/business/playlists/errores.test.ts`

`npx tsc -p tsconfig.type-tests.json --noEmit` → **exit 2**

- `TS2307: Cannot find module '@/business/playlists/errores.js' or its corresponding type
  declarations.`

Fallo por ausencia del comportamiento esperado (módulo inexistente), no por configuración
accidental: `vitest.config.ts` y `tsconfig.type-tests.json` no se modificaron.

### Implementación (GREEN)

- `src/business/playlists/errores.ts` (nuevo): tipos `DesenlaceErrorData`,
  `LimiteAgotadoConReintento` y `ErrorTipadoData`, más la función pura
  `clasificarErrorData(error: unknown)` con el mapeo aprobado de `ARCHITECTURE.md` §6.6:
  `null`/`undefined → SinSesion`, `401 → SesionCaducada`, `403 → PermisosInsuficientes`,
  `429 → LimiteAgotado` (conservando `reintentoTras` para TASK-009) y resto →
  `FalloInesperado` con causa depurada. Sin red, sin disco, sin terminal, sin registro y sin
  importar de Data, Presentation ni CLI.

#### Decisión de diseño documentada (no es `DISC-XXX`)

El comportamiento está especificado (RF-002, RNF-001, RNF-005, UC-001-E1, UC-001-E2, AC-004,
`ARCHITECTURE.md` §6.6); solo se decidió cómo se codifica:

- **`null`/`undefined → SinSesion`**: la ausencia de sesión se representa con la misma
  convención que `SesionProveedor.obtenerSesionVigente()` (`puertos.ts`, TASK-001), de modo que
  la clasificación cubre UC-001-E1 sin tocar los contratos aprobados de TASK-001 ni invocar el
  gateway (BR-001).
- **`LimiteAgotadoConReintento` como subtipo en `errores.ts`**: `types.ts` no se modifica (los
  contratos de TASK-001 solo cambian con `DISC-XXX`); al ser subtipo de `LimiteAgotado`, el
  desenlace sigue siendo assignable a `ResultadoCreacion` (aserción 10 de la prueba) y TASK-009
  dispone de `reintentoTras`.
- **`ErrorTipadoData` estructural**: Business describe el error por sus campos (`estado`,
  `causa`, `reintentoTras`) en lugar de importar `ErrorApiSpotify` de Data, replicando el
  patrón ya aprobado de `ErrorConEstado` en `politica-reintento.ts` (TASK-004): se conserva la
  dirección de dependencias `Presentation → Business → Data`.
- **Depuración propia de Business**: Data ya depura su `causa` (TASK-002), pero la función de
  dominio debe garantizar RNF-001 también ante errores ajenos a `ErrorApiSpotify` (`Error`
  genérico, cadena u objeto arbitrario), por lo que aplica una segunda barrera: omisión de
  cuerpos JSON, patrones de testigo/cabecera/credencial y tope de 200 caracteres. Los patrones
  no se importan de Data (prohibido por capas); la duplicación con `registro-tecnico.ts` es
  intencionada entre capas y de conjunto reducido.
- **Marcadores técnicos**: `HTTP ${estado}` (convención de Data) o `error sin causa detallada`
  cuando no hay origen de causa; son etiquetas de depuración para el registro, no literales de
  usuario, y los cinco literales de RF-002 no aparecen ni en el código ni en los resultados
  (aserción 7).

### Evidencia GREEN

`npx vitest run tests/business/playlists/errores.test.ts` → **exit 0**

- `Test Files 1 passed (1)`, `Tests 10 passed (10)`, `Type Errors no errors`.

**Comprobación de no vacuidad (mutaciones temporales, revertidas después)**:

1. `401` clasificado como `falloInesperado` → **exit 1** con `Tests 3 failed | 7 passed (10)` y
   `AssertionError: expected { resultado: 'falloInesperado', … } to deeply equal { …
   'sesionCaducada' }`.
2. `limiteAgotado` sin conservar `reintentoTras` → **exit 1** con `Tests 1 failed | 9 passed (10)`
   y `AssertionError: expected { … } to deeply equal { … reintentoTras: 7 }`.
3. `depurarCausa` devolviendo el texto sin depurar (`return base;`) → **exit 1** con
   `Tests 1 failed | 9 passed (10)` y `AssertionError: causa depurada de "Bearer
   eyJhbGciOiJIUzI1NiJ9.abcdefgh.ijklmnop": expected 'Bearer …' not to match /bearer/i`.

Mutaciones revertidas y suite en verde de nuevo.

### Refactorización

- **Depuración de la causa separada** (previsto por el TDD de la tarea): la resolución y
  depuración viven en `depurarCausa` (origen y sustitutos `HTTP ${estado}` o marcador técnico)
  y en `depurarTexto` (JSON, secretos y tope), separadas del mapeo de estados.
- **Extracción de `falloInesperadoCon(causa)`**: un único punto de construcción del desenlace
  genérico, antes duplicado en la rama `default` de `desenlacePorEstado` y en el caso final de
  `clasificarErrorData`; se elimina la duplicación y el doble cálculo de la causa.
- **Formateo con Biome** de los dos ficheros (firma de `limiteAgotado` a varias líneas y
  aserción de determinismo a varias líneas), sin cambio de comportamiento.
- **Corrección de tipos en la prueba** (tras ejecutar el typecheck de la carpeta): el acceso
  directo a `desconocido.causa` sobre la unión `DesenlaceErrorData` no compila; se sustituye por
  `toEqual({ resultado: 'falloInesperado', causa: 'error sin causa detallada' })`, que afirma lo
  mismo con estrechamiento válido. Sin cambio de comportamiento de la función.
- Verificación tras el refactor: TC-009 en verde con las mismas 10 pruebas.

### Validaciones ejecutadas

| Validación | Comando | Resultado |
| --- | --- | --- |
| TC-009 (unidad) | `npx vitest run tests/business/playlists/errores.test.ts` | exit 0 — 10 pruebas en verde |
| Carpetas de Business de la feature | `npx vitest run tests/business/playlists` | exit 0 — 7 ficheros, 51 pruebas |
| Suite completa | `npx vitest run` | exit 0 — 17 ficheros, 148 pruebas, sin errores de tipo (antes 16/138; +10 de TC-009) |
| Compilación estricta | `npx tsc --noEmit` | exit 0 |
| Nivel tipo | `npx tsc -p tsconfig.type-tests.json --noEmit` | exit 0 |
| Biome (ficheros de la tarea) | `npx biome check src/business/playlists/errores.ts tests/business/playlists/errores.test.ts` | exit 0 — 2 ficheros, sin errores |
| Complejidad cognitiva < 15 | Regla `complexity/noExcessiveCognitiveComplexity` de Biome sin incidentes en los 2 ficheros; inspección manual: la función más compleja (`depurarTexto`) tiene 3 decisiones | Cumple |
| Sin `any`, sin red, disco ni terminal | Prueba TC-009 «función pura sin efectos secundarios ni violación de capas»: 10 patrones prohibidos sin coincidencias en la fuente | Cumple |
| Sin mensajes de usuario en Business | Prueba TC-009 «ninguna rama produce mensajes de usuario»: 8 entradas clasificadas y fuente del módulo sin los 5 literales de RF-002 | Cumple |
| Contratos de TASK-001 y TASK-002 intactos | En esta tarea solo se crearon `src/business/playlists/errores.ts` y `tests/business/playlists/errores.test.ts`; no se editaron `types.ts`, `puertos.ts` ni `playlists-client.ts` | Cumple |

#### Observación de línea base (preexistente, ajena a TASK-007)

Se mantienen las observaciones de TASK-001 a TASK-006: `npx biome check .` a nivel de
repositorio devuelve 32 errores solo por ficheros no tocados por esta feature (`dist/`,
`package.json`, `.opencode/model-policy.json`; ninguna coincidencia con `errores.ts`) y
`npx vitest run --coverage` sigue sin el dependiente `@vitest/coverage-v8` (pendiente de decisión
del orquestador en TASK-020/TC-028). Los 2 ficheros de TASK-007 pasan `biome check` sin errores.
No se abre ningún `DISC-XXX`: no falta nada para completar TASK-007.

---

## TASK-008 — Business — caso de uso `crearPlaylistVacia` (sesión, validación, duplicados y éxito)

- **Fecha**: 2026-10-08
- **Trazabilidad**: `OBJ-001 → RF-001, RF-002, RNF-001, RNF-003, RNF-005, RNF-006 → UC-001, UC-001-A1, UC-001-E1, UC-001-E3 → AC-001, AC-004, AC-005 → TASK-008 → TC-010, TC-011, TC-012, TC-013`
- **Estado**: **bloqueada** — `DISCOVERY_REQUIRES_ANALYSIS` por `DISC-002` (`specs/003-creacion-de-playlist-vacia/DISCOVERIES.md`)

### TEST creado

- Ninguno. La tarea se detuvo **antes del RED**, en la fase de diseño de la prueba.

### Evidencia RED

- No se ejecutó ninguna prueba en RED: escribir TC-010 y TC-013 exige decidir primero cómo
  llega la confirmación/cancelación del usuario a `crearPlaylistVacia`, y esa decisión no
  está en los artefactos aprobados (ver `DISC-002`). Cualquier prueba escrita ahora fijaría
  un mecanismo especulativo (campo nuevo en `SolicitudCreacion`, quinto puerto u otro), lo
  que infringiría `NO TEST → NO IMPLEMENTATION` y la regla de no soluciones especulativas.

### Implementación (GREEN)

- Ninguna: no se creó `src/business/playlists/crear-playlist.ts` ni ningún otro fichero de
  producción. `types.ts` y `puertos.ts` (contratos de TASK-001) intactos.

### Refactorización

- No procede (sin implementación).

### Vacío detectado (resumen)

Con la entrada limitada a `{ nombre, descripcion?, visibilidad }` y a los cuatro puertos de
`ARCHITECTURE.md` §5: (1) ninguna invocación puede producir `Cancelado` (TC-013); (2) la
función no puede saber si «ya no hay posibilidad de cancelación» para condicionar el `info`
de inicio (TC-010); (3) la reinvocación tras la opción 2 del menú de duplicados vuelve a
detectar el mismo duplicado y no alcanza nunca `Exito`. Detalle y evidencia en `DISC-002`.

### Validaciones ejecutadas

| Validación | Comando | Resultado |
| --- | --- | --- |
| Estado del árbol antes de bloquear | `git status --short` | Sin ficheros nuevos de TASK-008; solo `DISCOVERIES.md` y este registro ampliados con el descubrimiento |
| Suite preexistente intacta (línea base) | `npx vitest run` (sin cambios de código) | Sin ejecuciones nuevas de TASK-008: la tarea no llegó al RED |

#### Observación

TC-011 y TC-012 sí serían derivables de los artefactos aprobados, pero el criterio de
finalización de TASK-008 exige TC-010 a TC-013 en verde; no se implementa una parte parcial
para no fijar el orden de pasos (sesión vs. cancelación vs. validación) que `DISC-002`
deja sin definir.

---

## TASK-008 (reintento) — Business — caso de uso `crearPlaylistVacia` tras la replanificación 0.1.1 de `DISC-002`

- **Fecha**: 2026-10-09
- **Trazabilidad**: `DISC-002 (PLANNING_OMISSION) → OBJ-001 → RF-001, RF-002, RNF-001, RNF-003, RNF-005, RNF-006 → UC-001, UC-001-A1, UC-001-E1, UC-001-E3 → AC-001, AC-004, AC-005 → TASK-008 → TC-010, TC-011, TC-012, TC-013`
- **Estado**: **completada** (TC-010, TC-011, TC-012 y TC-013 en verde; `TC-001` sigue en verde sin modificar sus aserciones)
- **Base normativa**: `TASKS.md` 0.1.1 (TASK-008 redefinida, TASK-014 ajustada, nota N-005, §8 condición 5), `TEST_PLAN.md` 0.1.1 (TC-010 y TC-013 reescritos; TC-011 y TC-012 intactos), `DISCOVERIES.md` DISC-002 + `IMPACT_ANALYSIS.md` (`PLANNING_OMISSION`, sin `CR-XXX`)
- **Nota**: este apartado reintenta la entrada anterior de TASK-008 (bloqueada por `DISCOVERY_REQUIRES_ANALYSIS`), que se conserva íntegra más arriba como historial.

### TEST creado

- `tests/business/playlists/crear-playlist.test.ts` (12 pruebas de ejecución):
  1. **TC-010** — el canal se invoca tras validación/duplicados y antes de crear; con `confirmada` el resultado es `Exito` con identificador y enlace y la traza observada es `sesión → listado → canal → info de inicio → creación → info de éxito`.
  2. **TC-010** — el `info` de inicio lleva nombre, visibilidad y descripción efectiva; el de éxito añade identificador (RNF-006).
  3. **TC-010** — con `duplicadoAceptado: true` se omite la comprobación resuelta (cero listados, cero advertencias) y se continúa a confirmación, creación y éxito (UC-001-A1 pasos 4/5).
  4. **TC-011** — sin sesión: `SinSesion` con cero invocaciones de gateway, de canal y de registro.
  5. **TC-011** — nombre de longitud inválida: `ErrorValidacion` de `nombre` sin listar, sin crear y sin invocar el canal (BR-004).
  6. **TC-011** — nombre vacío o solo espacios: `ErrorValidacion` de `nombre` (BR-004).
  7. **TC-011** — visibilidad `ausente` y `doble`: `ErrorValidacion` de `visibilidad` sin listar, sin crear y sin invocar el canal (BR-005).
  8. **TC-012** — `Duplicado` con el nombre efectivo, `advertencia` con el nombre y cero creaciones; el canal todavía no se invoca (BR-006, RNF-006).
  9. **TC-012** — sin coincidencia: sin advertencia y continuación al canal hasta `Exito`.
  10. **TC-013** — canal `cancelada`: `Cancelado`, cero `crearPlaylist` y cero eventos (BR-007, RNF-006).
  11. **TC-013** — también con `duplicadoAceptado: true` y canal `cancelada`: `Cancelado`, sin crear y sin eventos.
  12. Pureza de capas — análisis del código fuente de `crear-playlist.ts` contra 10 patrones prohibidos (`any`, Presentation, CLI, Data, Pino, `node:fs`, `fetch(`, `process.`, `console.`, `argv`/`readline`).

### Evidencia RED

`npx vitest run tests/business/playlists` → **exit 1**

- `Test Files  1 failed | 7 passed (8)`, `Tests  51 passed (51)`, `Errors  2 errors`.
- `Error: Cannot find package '@/business/playlists/crear-playlist.js' imported from C:/Proyectos/spoty2/tests/business/playlists/crear-playlist.test.ts` (0 tests del fichero nuevo).
- `TypeCheckError: Cannot find module '@/business/playlists/crear-playlist.js' or its corresponding type declarations.`
- `TypeCheckError: Object literal may only specify known properties, and 'duplicadoAceptado' does not exist in type 'SolicitudCreacion'.`
- Fallo por ausencia del comportamiento esperado (módulo `crear-playlist.ts` inexistente y canal de confirmación aún no escrito en el contrato), no por error de configuración accidental.

### Implementación (GREEN)

- `src/business/playlists/types.ts` (ampliado): tipos `DesenlaceConfirmacion` y `CanalConfirmacion` más los miembros `canalConfirmacion` (obligatorio) y `duplicadoAceptado?` de `SolicitudCreacion`. Intactos `nombre`, `descripcion`, `visibilidad`, la unión de 9 desenlaces de `ResultadoCreacion` y todos los demás tipos.
- `src/business/playlists/crear-playlist.ts` (nuevo): `crearPlaylistVacia(solicitud, dependencias)` con cuatro funciones pequeñas: `validarEntrada` (BR-004 → BR-005, sin efectos), `comprobarDuplicado` (listado solo con nombre válido, `advertencia` con nombre, omisión total con `duplicadoAceptado: true`), `crearTrasConfirmacion` (`info` de inicio → `crearPlaylist` → `info` de éxito) y la orquestación principal: sesión → validación → duplicados → canal → creación.
- `src/business/playlists/puertos.ts` **sin cambios**: `DependenciasCreacion` conserva exactamente los 4 puertos (TC-001 intacto).

#### Decisiones de diseño documentadas (no son `DISC-XXX`)

1. **Ampliación de `SolicitudCreacion` sin tocar TC-001**: `contratos.test.ts` y `contratos.test-d.ts` no construyen ninguna `SolicitudCreacion` ni afirman el conjunto exacto de sus claves (solo el tipo de `nombre`, `descripcion` y `visibilidad`), por lo que TC-001 queda en verde **sin modificar ninguna aserción**; los 9 desenlaces y las firmas de los 4 puertos permanecen idénticos.
2. **Mensajes técnicos de registro**: RNF-006 fija tipo de evento y campos, no literales de texto para `info`/`advertencia` (los literales aprobados de RF-002 los compone Presentation). Se eligieron marcadores técnicos en español: `Inicio de creación de playlist vacía`, `Playlist creada con éxito` y `Duplicado detectado contra listas propias`.
3. **Campos del `info` de inicio**: `ARCHITECTURE.md` §10 lo define con nombre efectivo y visibilidad; se emiten además `descripcionEfectiva` (RNF-006). El `identificador` no puede emitirse antes de crear, por lo que solo aparece en el `info` de éxito, conforme a §10.
4. **`duplicadoAceptado: true` omite la comprobación completa** (listado incluido) y no emite `advertencia`, «continuando directamente a la confirmación» según TASK-008 y UC-001-A1 pasos 4/5.
5. **Errores de servicio del gateway**: la clasificación 401/403/429/fallo y los reintentos pertenecen a TASK-009; en esta tarea la promesa rechazada se propaga sin tratar, sin adelantar `politica-reintento.ts` ni `clasificarErrorData`.

### Evidencia GREEN

`npx vitest run tests/business/playlists` → **exit 0**

- `Test Files  8 passed (8)`, `Tests  63 passed (63)`, `Type Errors  no errors` (51 preexistentes + 12 de TC-010 a TC-013).

### Refactorización

- `crearTrasConfirmacion`: extracción de `nombreEfectivo`, `visibilidad` y `descripcionEfectiva` mediante desestructuración y objeto `datos` compartido entre los dos `info`, eliminando la repetición de `entrada.*` en la entrada al gateway, en los dos registros y en el resultado.
- Reordenación de importaciones del fichero de prueba según Biome (`organizeImports`).
- Sin cambio de comportamiento: la traza observada y los resultados permanecen idénticos.

### Validaciones ejecutadas

| Validación | Comando | Resultado |
| --- | --- | --- |
| RED de la tarea | `npx vitest run tests/business/playlists` | exit 1 — módulo `crear-playlist.js` ausente (1 fichero fallido, 7 en verde, 2 errores de tipo) |
| Suite relevante (GREEN) | `npx vitest run tests/business/playlists` | exit 0 — 8 ficheros, 63 pruebas, 0 errores de tipo |
| Suite relevante (tras REFACTOR) | `npx vitest run tests/business/playlists` | exit 0 — 8 ficheros, 63 pruebas, 0 errores de tipo |
| Suite completa | `npx vitest run` | exit 0 — 18 ficheros, 160 pruebas, 0 errores de tipo |
| Tipos de producción | `npx tsc --noEmit` | exit 0 |
| Tipos de pruebas (`test-d`) | `npx tsc -p tsconfig.type-tests.json --noEmit` | exit 0 |
| Estática y formato de los ficheros tocados | `npx biome check src/business/playlists/crear-playlist.ts src/business/playlists/types.ts tests/business/playlists/crear-playlist.test.ts` | exit 0 — 3 ficheros, sin errores |

#### Desbloqueo

`DISC-002` queda **desbloqueado** por la replanificación 0.1.1 (`PLANNING_OMISSION`, sin `CR-XXX`): el canal aprobado se implementó tal como se diseñó. **No se abre ningún `DISC-XXX` nuevo** y la tarea no avanza a TASK-009.

---

## TASK-010 — Presentation — punto de entrada sin efectos secundarios

- **Fecha**: 2026-10-09
- **Trazabilidad**: `OBJ-001 → RNF-003, RNF-004, RNF-005 → UC-001 (ambos disparadores) → AC-002, AC-003 → TASK-010 → TC-016`
- **Estado**: completada (TC-016 en verde; `tsc --noEmit`, tipos de pruebas y Biome sin errores en los ficheros de la tarea)
- **Alcance respetado**: extracción pura de la lógica de `src/cli.ts` sin reglas de dominio nuevas, sin literales de playlist (TASK-011) ni lógica de creación (TASK-014/015/016); sin dependencias nuevas, sin rutas nuevas y sin carga dinámica (RNF-004/SEA)

### TEST creado

- `tests/presentation/cli-main.test.ts` (3 pruebas de integración, **TC-016**):
  1. **importación sin efectos secundarios**: con `process.stdout.write` y `process.exit` espionados, la importación dinámica de `@/cli-main.js` resuelve, no escribe nada en consola y no invoca `process.exit` (el proceso sigue vivo);
  2. **funciones invocables desde la prueba**: `main`, `handleCommand`, `runInteractiveMode` y `showHelp` se exportan como funciones y se invocan de verdad — `main()` con `process.argv = ['node','spoty','--help']` devuelve `0` y escribe la ayuda literal (`Uso:`, `  spoty [comando]`, `Modo interactivo:`); `handleCommand('comando-inexistente')` devuelve `-1` sin escribir nada; `showHelp()` devuelve `0`; `runInteractiveMode()` devuelve `0` y escribe `¡Hasta luego!` con la entrada simulada;
  3. **`src/cli.ts` conserva arranque y códigos de salida**: análisis de la fuente — `src/cli.ts` importa `main` de `./cli-main.js`, conserva `main()`, `.then((code) => process.exit(code))` y `process.exit(1)`, no contiene `async function main/handleCommand/runInteractiveMode/showHelp` ni importaciones de `business/`, y `package.json` mantiene `bin.spoty = dist/cli.js`; `src/cli-main.ts` contiene las cuatro funciones extraídas y el mapeo de códigos `AuthErrorType.CONFIG`/`PORT_IN_USE`.
- Doble de entrada: `vi.mock('@/presentation/prompts.js', importOriginal)` conserva el módulo original y sustituye únicamente `promptMenuChoice` (`'0'`) y `confirmExit` (`true`), de modo que el modo interactivo se invoca sin terminal real y sin abrir `readline`.
- `tsconfig.type-tests.json`: ampliado el `include` con `tests/presentation/**/*.ts` (precedente de TASK-002/TASK-003) para que la prueba nueva quede verificada por `tsc`.

### Evidencia RED

`npx vitest run tests/presentation/cli-main.test.ts` → **exit 1**

- `Test Files  1 failed (1)`, `Tests  3 failed (3)`, `Type Errors  no errors`.
- `Error: Cannot find package '@/cli-main.js' imported from C:/Proyectos/spoty2/tests/presentation/cli-main.test.ts` (pruebas 1 y 2).
- `Error: ENOENT: no such file or directory, open 'C:\Proyectos\spoty2\src\cli-main.ts'` (prueba 3).
- `npx tsc -p tsconfig.type-tests.json --noEmit` → **exit 2**: `TS2307: Cannot find module '@/cli-main.js' or its corresponding type declarations.` (×2).

Fallo por ausencia del comportamiento esperado (el módulo de lógica importable sin efectos secundarios no existe: hoy la única manera de importar la lógica es `src/cli.ts`, que ejecuta el arranque), no por error de configuración accidental: `vitest.config.ts` no se modificó y el único cambio de configuración es el `include` de pruebas nuevas.

### Implementación (GREEN)

- `src/cli-main.ts` (nuevo): extracción literal de la lógica de `src/cli.ts` (`ensureConfig`, `handleConnect`, `handleStatus`, `handleLogout`, `showMenu`, `getExitCodeForError`, `handleCommand`, `parseOutputDir`, `handleDownload`, `runInteractiveMode`, `showHelp`, `main`) con **exportación** de `main`, `handleCommand`, `runInteractiveMode` y `showHelp`. Mismos literales, mismos códigos de salida (0, 1, 2, 3, -1) y ninguna llamada a nivel de módulo.
- `src/cli.ts` (reducido a arranque, 13 líneas): importa `main`, `showError` y `MESSAGES` y conserva exclusivamente `main().then((code) => process.exit(code)).catch(... process.exit(1))`, idéntico al anterior.

#### Decisiones de diseño documentadas (no son `DISC-XXX`)

1. **Nombre del módulo `src/cli-main.ts`**: es el nombre orientativo previsto en `TASKS.md` § TASK-010; `package.json` (`main` y `bin` → `dist/cli.js`) y `dev` (`tsx src/cli.ts`) no cambian, por lo que el binario y el empaquetado SEA siguen apuntando al mismo punto de entrada (RNF-004).
2. **Sin efectos al importar**: el módulo nuevo solo declara funciones y constantes; ningún `process.exit`, ninguna escritura y ninguna llamada a `getLogger()` a nivel de módulo (los `readline` siguen creándose de forma perezosa en `prompts.ts`). Es lo que permite probar AC-002 y AC-003 sin que las pruebas sufran `process.exit`.
3. **Doble de entrada en el test**: la sustitución de `promptMenuChoice`/`confirmExit` se hace con `importOriginal` para conservar `showMessage`/`showError` reales y poder observar la escritura en consola.
4. **Sin exportar el resto de helpers**: `ensureConfig`, `handleDownload`, etc. permanecen privados; TC-016 solo exige las cuatro funciones públicas.

### Evidencia GREEN

`npx vitest run tests/presentation/cli-main.test.ts` → **exit 0**

- `Test Files  1 passed (1)`, `Tests  3 passed (3)`, `Type Errors  no errors`.

**Comprobación de no vaciedad (mutaciones temporales, revertidas después)**:

1. `process.stdout.write('ARRANQUE-EXTRAIDO\n')` a nivel de módulo en `cli-main.ts` → **exit 1** con `Tests 1 failed | 2 passed (3)` y `AssertionError: expected "Mock" to not be called at all, but actually been called 1 times` (vigila «no escribe en consola»).
2. `process.exit(7)` a nivel de módulo en `cli-main.ts` → **exit 1** con `Tests 1 failed | 2 passed (3)` y el mismo `AssertionError` sobre `terminacion` (vigila «no termina el proceso»; el espía instalado antes de la importación hace que la mutación sea detectable sin matar al worker).
3. `return showHelp()` → `return -1` en `main()` → **exit 1** con `Tests 1 failed | 2 passed (3)` y `AssertionError: expected -1 to be +0` (vigila `main` y el texto de la ayuda).

Mutaciones revertidas y suite en verde de nuevo.

### Refactorización

- `npx biome check --write` sobre los tres ficheros de la tarea → **sin correcciones necesarias** (imports ya ordenados, formato conforme: comillas simples, punto y coma, ancho 100).
- Revisión de duplicación: el código es un movimiento literal, sin lógica nueva ni copias paralelas; `cli.ts` queda en 13 líneas con un único punto de arranque y sin importaciones de Business.
- Complejidad cognitiva: las funciones no cambian de cuerpo respecto del original (la más compleja, `handleCommand`, conserva sus 4 ramas), muy por debajo de 15.
- Verificación tras el refactor: TC-016 en verde con las mismas 3 pruebas.

### Comportamiento observable del CLI intacto (A/B)

Se reconstruyó la versión previa (`git show HEAD:src/cli.ts` a `src/cli-orig-tmp.ts`, compilada junto al árbol actual) y se comparó con la versión extraída; **salidas y códigos de salida byte a byte idénticos** (`diff` sin diferencias):

| Escenario | Versión original | Versión con `cli-main.ts` |
| --- | --- | --- |
| `node dist/cli.js --help` | exit 0, ayuda literal completa | exit 0, idéntica (`diff` vacío) |
| `printf '0\ns' \| node dist/cli.js` (menú interactivo → salir → confirmar) | exit 0, menú y confirmación idénticos | exit 0, idéntico (`diff` vacío) |
| `node dist/cli.js no-existe` | exit 255 (`-1`) | exit 255 (`-1`), idéntico (`diff` vacío) |

El binario `spoty` (`package.json` `bin` → `dist/cli.js`) y `dev` (`tsx src/cli.ts`) apuntan al mismo fichero. `dist/` es ignorado por Git; los artefactos temporales de la comparación se eliminaron.

### Validaciones ejecutadas

| Validación | Comando | Resultado |
| --- | --- | --- |
| RED de la tarea | `npx vitest run tests/presentation/cli-main.test.ts` | exit 1 — 3 pruebas fallan por `@/cli-main.js` ausente (`tsc` de tipos: exit 2, TS2307) |
| TC-016 (GREEN y tras REFACTOR) | `npx vitest run tests/presentation/cli-main.test.ts` | exit 0 — 1 fichero, 3 pruebas en verde |
| Suite completa | `npx vitest run` | exit 0 — 19 ficheros, 163 pruebas, 0 errores de tipo (antes 18/160; +3 de TC-016) |
| Compilación estricta | `npx tsc --noEmit` | exit 0 |
| Tipos de pruebas | `npx tsc -p tsconfig.type-tests.json --noEmit` | exit 0 |
| Estática y formato de los ficheros tocados | `npx biome check src/cli-main.ts src/cli.ts tests/presentation/cli-main.test.ts tsconfig.type-tests.json` | exit 0 — 4 ficheros, sin errores |
| Empaquetado SEA compatible (RNF-004) | `npx tsc && npx tsc-alias` y ejecución de `dist/cli.js` | exit 0 en build; arranque sin dependencias nuevas, sin carga dinámica y con `bin` intacto |
| Complejidad cognitiva < 15 | Regla `complexity/noExcessiveCognitiveComplexity` de Biome sin incidentes | Cumple |
| Sin `any` ni `console.` en producción | Reglas `noExplicitAny` (error) y `noConsole` (warn) sin incidentes en `src/cli-main.ts` ni `src/cli.ts` | Cumple |
| Pruebas de otras tareas intactas | `git status --short tests/business tests/data` | Sin modificaciones (solo `tests/presentation/` nuevo) |

#### Observación de línea base (preexistente, ajena a TASK-010)

Se mantienen las observaciones de TASK-001 a TASK-008: `npx biome check .` a nivel de repositorio devuelve errores solo por ficheros no tocados por esta feature (`dist/`, `package.json`, `.opencode/model-policy.json`) y `npx vitest run --coverage` sigue sin el dependiente `@vitest/coverage-v8` (pendiente de decisión del orquestador en TASK-020/TC-028). Los 4 ficheros de TASK-010 pasan `biome check` sin errores. **No se abre ningún `DISC-XXX`**: no falta nada para completar TASK-010. La tarea no avanza a TASK-011.

---

## TASK-009 — Business — integración de reintentos 429 y errores de servicio en el caso de uso

- **Fecha**: 2026-10-09
- **Trazabilidad**: `OBJ-001 → RF-002, RNF-001, RNF-005, RNF-006 → UC-001-E2 → AC-004 → TASK-009 → TC-014, TC-015`
- **Estado**: completada (TC-014 y TC-015 en verde; suite completa, `tsc --noEmit`, tipos de pruebas y Biome sin errores en los ficheros de la tarea)
- **Alcance respetado**: extensión de `src/business/playlists/crear-playlist.ts` sin módulos de producción nuevos, sin dependencias nuevas y sin tocar ningún artefacto aprobado ni las pruebas de TASK-001 a TASK-008 y TASK-010

### TEST creado

- `tests/business/playlists/crear-playlist-reintentos.test.ts` (7 pruebas de ejecución):
  1. **TC-014** — `429` persistente sin cabecera: resultado `LimiteAgotado` con causa `HTTP 429`, **4 invocaciones del gateway como máximo**, 3 esperas de `10000` ms capturadas por el doble de `Espera`, 3 `advertencia` con `intento` 1-3 y `estado` 429, un único `error` final con `{ causa }`, un solo `info` (el de inicio, sin `info` de éxito) y traza exacta `sesion → listar → canal → info → (crear → advertencia → espera) × 3 → crear → error`.
  2. **TC-014** — `429` con cabecera (`reintentoTras = 7`): esperas de `7000` ms (`reintentoTras * 1000`), 4 intentos, desenlace `LimiteAgotado`, 3 advertencias y 1 `error` final.
  3. **TC-014** — ningún evento de registro contiene testigos, cabeceras de autorización ni cuerpos de respuesta cuando la causa del error es sensible (RNF-001).
  4. **TC-015** — `401 → SesionCaducada`: 1 invocación del gateway, 0 esperas, 0 advertencias, 1 `error` final con causa depurada y traza sin reintentos (`sesion → listar → canal → info → crear → error`).
  5. **TC-015** — `403 → PermisosInsuficientes` con las mismas garantías de ausencia de reintentos.
  6. **TC-015** — fallo genérico estructurado (`500`) y error no estructurado (`Error`) → `FalloInesperado`, ambos con 1 sola invocación, sin esperas y sin advertencias.
  7. **TC-015** — causa depurada y registros sin datos sensibles (testigo de sesión, `Bearer`, JWT, `authorization`, cuerpos JSON) más conjunto cerrado de campos de registro (`CamposRegistro`).
- Dobles: los cuatro puertos (`SesionProveedor`, `PlaylistGateway` que siempre rechaza, `RegistroTecnico` que captura eventos y `Espera` que captura los retardos) más el canal de confirmación; **sin temporizadores reales** (toda espera pasa por el doble de `Espera`, ADR-001).

### Evidencia RED

`npx vitest run tests/business/playlists/crear-playlist-reintentos.test.ts` → **exit 1**

- `Test Files  1 failed (1)`, `Tests  7 failed (7)`, `Type Errors  no errors`.
- Fallo observado: la promesa rechazada del gateway se propaga sin tratar — `ErrorApiPrueba: HTTP 429` (y 401, 403, 500, `fallo de red`) con marcas en `crearTrasConfirmacion src/business/playlists/crear-playlist.ts:115` y `crearPlaylistVacia …:170`; ninguna advertencia, ninguna espera, ningún `error` final y ningún desenlace de dominio.
- Fallo por ausencia del comportamiento esperado (el caso de uso aún no envuelve la creación con la política ni clasifica errores de servicio), no por error de configuración accidental: el módulo importaba correctamente, `vitest.config.ts` no se modificó y no hubo errores de tipo.

### Implementación (GREEN)

- `src/business/playlists/crear-playlist.ts` (ampliado, único fichero de producción de la tarea):
  - import de `withRetry` (`src/business/retry/retry.ts`), de `politicaReintento429` (TASK-004) y de `clasificarErrorData` (TASK-007), más el tipo `PlaylistCreada`;
  - constante técnica `MENSAJE_ERROR_FINAL = 'Creación de playlist no completada'` (marcador técnico, no literal de usuario de RF-002);
  - la ordenación de creación pasa a `withRetry(operación, politicaReintento429, {}, { espera, registro })`: hasta 3 reintentos ante `429`, espera `reintentoTras * 1000` ms cuando Data lo aporta y `10000` ms en su ausencia, `advertencia` por reintento con intento y estado, `Espera` y `RegistroTecnico` siempre inyectados (Business sin temporizadores ni Pino);
  - captura del error: `clasificarErrorData` produce `SesionCaducada` (401), `PermisosInsuficientes` (403), `LimiteAgotado` (429 persistente) o `FalloInesperado`, y se emite el `error` final con `{ causa }` depurada cuando el desenlace la aporta;
  - `crearTrasConfirmacion` pasa a devolver `ResultadoCreacion` (antes `Exito`), lo que permite el desenlace de error sin tocar la unión aprobada de 9 desenlaces.
- `src/business/playlists/types.ts`, `src/business/playlists/puertos.ts`, `src/business/playlists/errores.ts` y `src/business/playlists/politica-reintento.ts` **sin cambios**; ninguna prueba de tareas anteriores modificada.

#### Decisiones de diseño documentadas (no son `DISC-XXX`)

1. **Reutilización de `withRetry` + `politicaReintento429` (ADR-001)**: no se escribió ningún bucle de reintento propio ni se duplicó la lógica de espera; la `advertencia` por reintento con intento y estado ya la emite el reporter por puerto de `retry.ts`, y su ruta Pino por defecto no se usa porque siempre se inyectan `Espera` y `RegistroTecnico`.
2. **`error` final solo cuando hay causa**: `clasificarErrorData` puede devolver `SinSesion` (sin causa) ante un error `null`/`undefined`; en ese caso no se emite registro, conforme a la fila «Sin sesión → Sin registro» de `ARCHITECTURE.md` §6.6.
3. **`LimiteAgotado` con `reintentoTras` conservado**: el desenlace devuelto es el subtipo `LimiteAgotadoConReintento` de TASK-007 (asignable al `LimiteAgotado` aprobado); Presentation solo consume `resultado` y `causa`, por lo que la unión de 9 desenlaces y TC-001 permanecen intactos.
4. **Mensajes técnicos**: RNF-006 fija nivel de evento y campos, no literales; el `error` final usa el marcador técnico en español `Creación de playlist no completada` con `{ causa }`, sin ninguno de los literales aprobados de RF-002 (los compone Presentation).

### Evidencia GREEN

`npx vitest run tests/business/playlists/crear-playlist-reintentos.test.ts tests/business/playlists/crear-playlist.test.ts` → **exit 0**

- `Test Files  2 passed (2)`, `Tests  19 passed (19)`, `Type Errors  no errors` (7 nuevos de TC-014/TC-015 + 12 de TC-010 a TC-013 intactos).

### Refactorización

- Separación de responsabilidades prevista por el plan de TDD de la tarea, sin cambiar resultados: la envoltura de reintentos queda en `crearConPoliticaReintento` (gateway bajo `politicaReintento429` con puertos inyectados) y la clasificación con el `error` final en `clasificarFalloCreacion(error, registroTecnico)`; `crearTrasConfirmacion` queda como orquestador del `info` de inicio, la llamada y el `info` de éxito.
- Eliminación de dos constantes sin uso en el fichero de prueba (Biome `noUnusedVariables`) y verificación de importaciones ordenadas.
- Tras el refactor: mismas 7 pruebas verdes y misma traza observada.

### Validaciones ejecutadas

| Validación | Comando | Resultado |
| --- | --- | --- |
| RED de la tarea | `npx vitest run tests/business/playlists/crear-playlist-reintentos.test.ts` | exit 1 — 7 pruebas fallan porque el error del gateway se propaga sin reintentar ni clasificar (0 errores de tipo) |
| TC-014 y TC-015 (GREEN) | `npx vitest run tests/business/playlists/crear-playlist-reintentos.test.ts tests/business/playlists/crear-playlist.test.ts` | exit 0 — 2 ficheros, 19 pruebas |
| Suite relevante (tras REFACTOR) | `npx vitest run tests/business/playlists` | exit 0 — 9 ficheros, 70 pruebas, 0 errores de tipo |
| Suite completa | `npx vitest run` | exit 0 — 20 ficheros, 170 pruebas, 0 errores de tipo (antes 19/163; +7 de TC-014/TC-015) |
| Compilación estricta | `npx tsc --noEmit` | exit 0 |
| Tipos de pruebas | `npx tsc -p tsconfig.type-tests.json --noEmit` | exit 0 |
| Estática y formato de los ficheros tocados | `npx biome check src/business/playlists/crear-playlist.ts tests/business/playlists/crear-playlist-reintentos.test.ts` | exit 0 — 2 ficheros, sin errores |
| Recuento de intentos ante 429 | Aserción `ctx.llamadas.crear` en TC-014 | 4 intentos como máximo (3 reintentos) en ambos escenarios de cabecera |
| Sin temporizadores reales | TC-014/TC-015 con doble de `Espera` | Todas las esperas (30000 ms declarados) capturadas sin gastar tiempo real |
| Complejidad cognitiva < 15 | Regla `complexity/noExcessiveCognitiveComplexity` de Biome sin incidentes en los 2 ficheros | Cumple |
| Sin `any` ni efectos directos en Business | Prueba de pureza de `crear-playlist.test.ts` (10 patrones prohibidos) en verde sobre la fuente ampliada; `noExplicitAny` sin incidentes | Cumple |
| Sin datos sensibles en registros | TC-014 y TC-015: serialización de todos los eventos contra 6 patrones sensibles, más campos de registro dentro del conjunto cerrado | Cumple |
| Pruebas de otras tareas intactas | `git status --short` | Sin modificaciones en ficheros de prueba ajenos; solo ficheros nuevos de la feature |

#### Observación de línea base (preexistente, ajena a TASK-009)

Se mantienen las observaciones de TASK-001 a TASK-010: `npx biome check .` a nivel de repositorio sigue reportando solo ficheros no tocados por esta feature (`dist/`, `package.json`, `.opencode/model-policy.json`) y `npx vitest run --coverage` sigue sin el dependiente `@vitest/coverage-v8` (pendiente de decisión del orquestador en TASK-020/TC-028). Los 2 ficheros de TASK-009 pasan `biome check` sin errores. **No se abre ningún `DISC-XXX`**: no falta nada para completar TASK-009. La tarea no avanza a TASK-011.

---

## TASK-011 — Presentation — literales exactos aprobados

- **Fecha**: 2026-10-09
- **Trazabilidad**: `OBJ-001 → RF-002, RNF-002 → UC-001 → AC-001, AC-002, AC-003, AC-004, AC-005 → TASK-011 → TC-017`
- **Estado**: completada (TC-017 en verde; suite completa, `tsc --noEmit` y Biome sin errores en los ficheros de la tarea)
- **Alcance respetado**: extensión de `src/presentation/messages.ts` sin alterar ningún literal preexistente de `MESSAGES`, sin dependencias nuevas y sin modificar especificación, requisitos, arquitectura ni casos de uso aprobados

### TEST creado

- `tests/presentation/messages.test.ts` — **TC-017**, 20 pruebas de ejecución en 3 grupos:
  1. **Mensajes de resultado (11 pruebas)**: la plantilla de éxito carácter a carácter con visibilidad `privada` y con `pública` (nombre, visibilidad visible con tilde, descripción efectiva, identificador y enlace) y los 10 literales aprobados de éxito, error, duplicado y cancelación: longitud de nombre, flag único de visibilidad, sin sesión, sesión caducada, permisos, límite agotado sin punto final, fallo inesperado, duplicado como plantilla y cancelación.
  2. **Peticiones, menús y ayuda (5 pruebas)**: `Nombre de la playlist (3-100 caracteres):`, `Descripción (opcional, Enter para usar "Playlist sin descripción"):`, el menú de duplicados con las tres opciones y la elección, la pregunta `¿Deseas modificar descripción y visibilidad? (s/N): ` con su espacio final, el ítem `4. Crear playlist vacía` y la ayuda `(navega con 0-4,9, Ctrl+C para cancelar)`.
  3. **Literales preexistentes de `MESSAGES` sin cambios (4 pruebas)**: welcome y menú principal, configuración, autenticación y errores, cada uno con sus valores exactos.

### Evidencia RED

Evidencia original de la sesión de implementación de la tarea, `npx vitest run tests/presentation/messages.test.ts` → **exit 1**:

- **16 pruebas en fallo**: las que exigen los literales nuevos de `MESSAGES` (sección `playlist`, `menu.createPlaylist` y `menu.hintCreatePlaylist`), aún inexistentes; solo pasaban las 4 pruebas de regresión de los literales preexistentes.
- **`TypeCheckError: TS2339`** al acceder a las propiedades nuevas de `MESSAGES`, coherente con la ausencia de la sección `playlist`.
- Fallo por ausencia del comportamiento esperado, no por error de configuración accidental: el fichero de prueba importaba `@/presentation/messages.js` sin problemas y `vitest.config.ts` no se modificó.

### Implementación (GREEN)

- `src/presentation/messages.ts` (único fichero de producción de la tarea, ampliado):
  - constante `VISIBILIDAD_EXIBIBLE` (`publica → pública`, `privada → privada`) que aporta la forma visible aprobada con tilde;
  - nueva sección `playlist` con la plantilla `created(nombre, visibilidad, descripción, identificador, enlace)`, los 7 literales de error, `duplicate`, `duplicateMenu`, `cancelled`, `namePrompt`, `descriptionPrompt` y `modifyPrompt`;
  - `menu.createPlaylist` y `menu.hintCreatePlaylist` junto a los literales de menú preexistentes, que permanecen intactos.

### Evidencia GREEN

`npx vitest run tests/presentation/messages.test.ts` → **exit 0** — `Test Files 1 passed (1)`, `Tests 20 passed (20)`, `Type Errors no errors`.

### Refactorización

- Agrupación de los literales en la sección `playlist` sin alterar ningún valor; los dos literales extensos (éxito y menú de duplicados) quedan partidos en concatenación de cadenas para la longitud de línea de Biome con idéntico contenido carácter a carácter; el mapejo de visibilidad se centraliza en `VISIBILIDAD_EXIBIBLE`; importaciones ordenadas sin cambios. Tras el refactor: mismas 20 pruebas en verde.

### Comprobación de no vacuidad por mutación temporal revertida

Se aplicaron dos mutaciones sobre `src/presentation/messages.ts`, se demostró TC-017 en rojo y se revirtió cada una. El fichero quedó idéntico al original: SHA-256 `74CEC8C695568C6E07AD705DA8DF11E1C3DD1384D0E5ED3994B48F6D707192A0` antes y después de las mutaciones.

| Mutación temporal | Comando | Resultado |
| --- | --- | --- |
| Añadir un punto final a `playlist.rateLimitError` | `npx vitest run tests/presentation/messages.test.ts` | exit 1 — 1 fallo: `límite agotado (429) sin punto final` (`expected 'Vuelva a intentarlo más tarde.' to be 'Vuelva a intentarlo más tarde'`) |
| Revertir la mutación A | `npx vitest run tests/presentation/messages.test.ts` | exit 0 — 20/20 en verde |
| `VISIBILIDAD_EXIBIBLE.publica = 'publica'` (sin tilde) | `npx vitest run tests/presentation/messages.test.ts` | exit 1 — 1 fallo: `éxito como plantilla carácter a carácter con visibilidad pública` (`(publica, …)` frente a `(pública, …)`) |
| Revertir la mutación B | `npx vitest run tests/presentation/messages.test.ts` | exit 0 — 20/20 en verde y SHA-256 idéntico al previo (sin rastro de mutación) |

Auditoría adicional de cierre carácter a carácter contra `TASKS.md` TASK-011: script temporal desechable `tests/presentation/tmp-audit-tc017.test.ts` (4 pruebas, exit 0, **eliminado** tras su uso, sin dejar rastro en el repositorio). Comprobó que los 18 segmentos literales del párrafo «Resultado verificable» de TASK-011 se cubren con los valores reales de `MESSAGES`: los 14 literales fijos coinciden como segmento exacto, las 2 plantillas (éxito y duplicado) renderizan el molde aprobado y **0 segmentos aprobados quedan sin implementar**.

### Validaciones ejecutadas

| Validación | Comando | Resultado |
| --- | --- | --- |
| RED de la tarea (evidencia original) | `npx vitest run tests/presentation/messages.test.ts` | exit 1 — 16 pruebas en fallo y `TypeCheckError TS2339` (literales nuevos inexistentes) |
| TC-017 (GREEN y tras REFACTOR) | `npx vitest run tests/presentation/messages.test.ts` | exit 0 — 1 fichero, 20 pruebas, 0 errores de tipo |
| No vacuidad: mutación A (literal del límite 429) | `npx vitest run tests/presentation/messages.test.ts` | exit 1 — 1 fallo; revertida → exit 0 |
| No vacuidad: mutación B (`VISIBILIDAD_EXIBIBLE`) | `npx vitest run tests/presentation/messages.test.ts` | exit 1 — 1 fallo; revertida → exit 0 con SHA-256 idéntico al previo |
| Auditoría carácter a carácter contra TASK-011 | script temporal desechable (4 pruebas) | exit 0 — 18/18 segmentos aprobados cubiertos; fichero temporal eliminado |
| Suite completa | `npx vitest run` | exit 0 — 21 ficheros, 190 pruebas, 0 errores de tipo (antes 20/170; +1 fichero y +20 pruebas de TC-017) |
| Compilación estricta | `npx tsc --noEmit` | exit 0 |
| Estática y formato de los ficheros de la tarea | `npx biome check src/presentation/messages.ts tests/presentation/messages.test.ts` | exit 0 — 2 ficheros, sin errores |
| Literales preexistentes intactos | TC-017, grupo «literales preexistentes de `MESSAGES` sin cambios» (4 pruebas) | Verde |
| Pruebas de otras tareas intactas | `npx vitest run` y `git status --short` | 190 pruebas en verde sin modificar ningún fichero de TASK-001 a TASK-010 |

#### Observación

**No se abre ningún `DISC-XXX`**: no falta nada para completar TASK-011 —los 18 literales aprobados existen carácter a carácter, TC-017 está en verde, `tsc` y Biome en verde y no se modifica ningún artefacto aprobado. Se mantienen las observaciones de línea base de las tareas anteriores: `npx biome check .` a nivel de repositorio reporta solo ficheros no tocados por esta feature (`dist/`, `package.json`, `.opencode/model-policy.json`) y `npx vitest run --coverage` sigue sin el dependiente `@vitest/coverage-v8` (pendiente de decisión del orquestador en TASK-020/TC-028). Los 2 ficheros de TASK-011 pasan `biome check` sin errores.

---

## TASK-013 — Presentation — composición de dependencias reales

- **Fecha**: 2026-10-09
- **Trazabilidad**: `OBJ-001 → RF-001, RNF-003, RNF-006 → UC-001 → AC-001, AC-004 → TASK-013 → TC-019`
- **Estado**: completada (TC-019 en verde; suite completa, `tsc --noEmit`, tipos de pruebas y Biome sin errores en los ficheros de la tarea)
- **Alcance respetado**: dos ficheros nuevos (`src/presentation/composicion-crear-playlist.ts` y su prueba); sin modificar `src/presentation/prompts.ts` ni `tests/presentation/messages.test.ts` (TASK-012 en curso en otra sesión), sin dependencias nuevas, sin artefactos aprobados tocados y sin commits

### TEST creado

- `tests/presentation/composicion-crear-playlist.test.ts` — **TC-019**, 6 pruebas de ejecución:
  1. **Composición operable con éxito**: `componerCrearPlaylistVacia()` devuelve un caso de uso que, con doble de red y tokens en fichero temporal, produce `exito` con `nombreEfectivo`, visibilidad, descripción efectiva, identificador y enlace; la primera llamada de red es `GET https://api.spotify.com/v1/me` con `Bearer` del testigo almacenado (evidencia de `SesionProveedor` real sobre `getStoredTokens`/`checkExistingSession`) y la creación es `POST /v1/users/usuario-tc-019/playlists` con el mismo testigo (evidencia de `PlaylistGateway` real sobre `SPOTY_TOKENS_FILE`).
  2. **Registro aislado en fichero temporal**: `info` de inicio y `info` de éxito con `level: 30`, nombre, visibilidad, descripción efectiva e identificador en `SPOTY_LOG_FILE`; contenido sin patrones `bearer`/`authorization` ni testigo (RNF-001); `data/app.log` y `data/tokens.json` del repositorio no contienen el nombre único de la prueba ni el testigo ficticio (sin escritura en `data/` real).
  3. **UC-001-E1**: sin tokens almacenados el caso compuesto devuelve `sinSesion` con **cero** llamadas de red.
  4. **P-003 sin cambio en la conexión**: `REQUIRED_SCOPES` contiene `playlist-modify-public` y `playlist-modify-private`, los ámbitos siguen declarados en `src/business/auth/types.ts` y la composición no redefine ámbitos.
  5. **Revisión de imports de las tres capas (RNF-003)**: la composición importa de Business y de Data sin efectos directos (`node:fs`, `fetch(`, `console.`, `process.`, `any`) ni reglas propias (`esLongitudValida`, `esDuplicadoPropio`, `withRetry`, `Retry-After`); los 6 módulos de `src/business/playlists/` no importan Presentation, CLI, Data, Pino ni efectos directos; los 2 módulos de Data revisados no importan Business ni Presentation.
  6. **Composición única**: un solo módulo de `src/presentation/*.ts` construye los cuatro puertos (`playlistGateway:` y `registroTecnico:`) y `src/cli.ts`/`src/cli-main.ts` no construyen dependencias ni importan de Data, de modo que el comando directo y la opción 4 delegarán en esta única función.
- Dobles: **doble de red** sobre `globalThis.fetch` (rutas `/v1/me`, `/v1/me/playlists` y `POST /v1/users/…/playlists`); ficheros de tokens y de registro en directorio temporal vía `SPOTY_TOKENS_FILE` y `SPOTY_LOG_FILE`; **los cuatro puertos son los reales** (sin dobles de puertos), conforme a TC-019.

### Evidencia RED

`npx vitest run tests/presentation/composicion-crear-playlist.test.ts` → **exit 1**

- `Test Files 1 failed (1)`, `Tests no tests` (0 recogidas), `Type Errors no errors`.
- Fallo observado: `Error: Cannot find package '@/presentation/composicion-crear-playlist.js' imported from C:/Proyectos/spoty2/tests/presentation/composicion-crear-playlist.test.ts`.
- Fallo por ausencia del comportamiento esperado (módulo de composición inexistente), no por error de configuración accidental: el alias `@/` resuelve el resto de módulos en las suites existentes, `vitest.config.ts` no se modificó y no hubo errores de tipo.

### Implementación (GREEN)

- `src/presentation/composicion-crear-playlist.ts` (nuevo, único fichero de producción de la tarea):
  - `type CasoUsoCrearPlaylist = (solicitud) => Promise<ResultadoCreacion>`, para que los puntos de entrada (TASK-014, TASK-015 y TASK-016) invoken el caso de uso con la solicitud y sin dependencias;
  - `sesionDeAlmacenamiento: SesionProveedor` sobre `getStoredTokens` (sin red cuando no hay tokens almacenados) y `checkExistingSession` (validación de la sesión vigente), devolviendo `{ testigoSesion }` o `null` (BR-001, UC-001-E1);
  - `crearPlaylistGateway()` de Data como `PlaylistGateway` real (sesión encapsulada en Data sobre `SPOTY_TOKENS_FILE`);
  - `crearRegistroTecnico()` de Data como `RegistroTecnico` real hacia `data/app.log` o `SPOTY_LOG_FILE`;
  - `esperaDeTemporizador: Espera` real de temporizador, única fuente de retardo de la creación (todo espera pasa por el puerto `Espera`, ADR-001);
  - `componerCrearPlaylistVacia()` como **única** composición de arranque: construye `DependenciasCreacion` una sola vez y devuelve el caso de uso enlazado.

#### Decisión de diseño documentada (no es `DISC-XXX`)

El comportamiento está especificado; solo se decidió cómo se codifica el ensamblaje:

- La composición **no acepta opciones de prueba**: los puertos son siempre los reales («composición real», TC-019). El aislamiento se consigue con `SPOTY_TOKENS_FILE` y `SPOTY_LOG_FILE` más un doble de red global, que es el punto de inyección ya aprobado en TASK-002 (`fetch` global por defecto y `OpcionesGateway.fetchInyectado`).
- `SesionProveedor` usa **ambas** funciones existentes: `getStoredTokens` como vía rápida sin red cuando no hay sesión almacenada y `checkExistingSession` para validar la vigencia (§5 «a partir de `getStoredTokens` o `checkExistingSession`», §7). No se crea lógica de sesión nueva.
- La composición devuelve el caso de uso **enlazado** y no `DependenciasCreacion`, para que ningún punto de entrada vuelva a ensamblar puertos («única función de composición», TASK-013) y para que una futura GUI reutilice el mismo caso de uso sin CLI (RNF-003, ARCHITECTURE §8).
- `Espera` de temporizador se declara en la composición (Presentation ensamla Business y Data), no en Business: Business sigue sin temporizadores propios y en las pruebas de unidad de TASK-009 el puerto se dobla desde las dependencias.

### Evidencia GREEN

`npx vitest run tests/presentation/composicion-crear-playlist.test.ts` → **exit 0** — `Test Files 1 passed (1)`, `Tests 6 passed (6)`, `Type Errors no errors`.

Nota de iteración dentro de GREEN: la primera ejecución quedó en 5/6 porque el doble de red normalizaba las cabeceras con `new Headers(...)` (minúsculas) y la aserción `cabeceras.Authorization` no encontraba la cabecera original. Se corrigió **el doble de prueba** para conservar las cabeceras tal como las envía cada cliente; la implementación de producción no cambió. Ninguna aserción se relajó.

### Refactorización

- `npx biome check --write` sobre los 2 ficheros → 2 ficheros corregidos solo en formato (import de tipos multilinea y salto de línea en el predicado del `find`); sin cambios de comportamiento y TC-019 en verde tras el formato.
- Duplicación: verificación explícita de que la composición es única — `src/cli.ts` y `src/cli-main.ts` no construyen `DependenciasCreacion` ni importan de Data, y el único módulo de `src/presentation/*.ts` que ensamla los cuatro puertos es la composición (prueba 6 de TC-019). El «eliminar duplicación entre puntos de entrada» queda garantizado de raíz: los dos disparadores (TASK-015 y TASK-016) invocarán esta misma función, que todavía no existe duplicada.
- Complejidad cognitiva: la función más compleja de producción es `componerCrearPlaylistVacia` con 1 rama; muy por debajo de 15. Sin `any`, sin `console`, sin `process` en producción.

### Comprobación de no vaciedad (mutaciones temporales, revertidas después)

SHA-256 del fichero de producción antes y después de las mutaciones: `76D90F57D0692F1BB305226EB28552F38E25948DB54FE65C74566FA5615E2EE4` (idéntico, sin rastro de mutación).

| Mutación temporal | Comando | Resultado |
| --- | --- | --- |
| A: `obtenerSesionVigente` devuelve siempre `null` (SesionProveedor dejado de ser real) | `npx vitest run tests/presentation/composicion-crear-playlist.test.ts` | exit 1 — 2 fallos: `expected { resultado: 'sinSesion' } to deeply equal { resultado: 'exito', … }` y `Tiempo agotado esperando Playlist creada con éxito; el fichero tiene 0 líneas` |
| Revertir la mutación A | comprobación de hash | SHA-256 idéntico al previo |
| B: `registroTecnico` sustituido por un doble en memoria (RegistroTecnico dejado de ser real) | `npx vitest run tests/presentation/composicion-crear-playlist.test.ts` | exit 1 — 1 fallo: `Tiempo agotado esperando Playlist creada con éxito; el fichero tiene 6 líneas` (solo las líneas de autenticación) |
| Revertir la mutación B y volver a TC-019 | `npx vitest run tests/presentation/composicion-crear-playlist.test.ts` | exit 0 — 6/6 en verde y SHA-256 idéntico al previo |

### Validaciones ejecutadas

| Validación | Comando | Resultado |
| --- | --- | --- |
| RED de la tarea | `npx vitest run tests/presentation/composicion-crear-playlist.test.ts` | exit 1 — fallo por módulo de composición inexistente (`Cannot find package '@/presentation/composicion-crear-playlist.js'`), 0 errores de tipo |
| TC-019 (GREEN y tras REFACTOR) | `npx vitest run tests/presentation/composicion-crear-playlist.test.ts` | exit 0 — 1 fichero, 6 pruebas, 0 errores de tipo |
| No vacuidad: mutación A (SesionProveedor) | `npx vitest run tests/presentation/composicion-crear-playlist.test.ts` | exit 1 — 2 fallos; revertida → exit 0 con SHA-256 idéntico |
| No vacuidad: mutación B (RegistroTecnico) | `npx vitest run tests/presentation/composicion-crear-playlist.test.ts` | exit 1 — 1 fallo; revertida → exit 0 con SHA-256 idéntico |
| Sin escritura en `data/` real | comprobación de `data/app.log` tras la suite | Sin marca de nombre ni de testigo de la prueba |
| Suite completa | `npx vitest run` | exit 0 — 22 ficheros, 196 pruebas, 0 errores de tipo (antes 21/190; +1 fichero y +6 pruebas de TC-019) |
| Compilación estricta | `npx tsc --noEmit` | exit 0 |
| Tipos de pruebas | `npx tsc -p tsconfig.type-tests.json --noEmit` | exit 0 |
| Estática y formato de los ficheros tocados | `npx biome check src/presentation/composicion-crear-playlist.ts tests/presentation/composicion-crear-playlist.test.ts` | exit 0 — 2 ficheros, sin errores |
| Complejidad cognitiva < 15 | Regla `complexity/noExcessiveCognitiveComplexity` de Biome sin incidentes | Cumple |
| Sin `any` ni efectos directos en producción | `noExplicitAny` sin incidentes y revisión de imports de TC-019 (prueba 5) | Cumple |
| Reutilización no CLI (RNF-003) | TC-019 pruebas 1 y 6: caso de uso invocado con solicitud y sin `argv`, `readline` ni terminal; puntos de entrada sin ensamblaje propio | Cumple |
| Pruebas de otras tareas intactas | `git status --short -- src tests` | Solo los 2 ficheros nuevos de TASK-013; sin cambios en `prompts.ts`, `messages.test.ts` ni en ficheros de TASK-001 a TASK-011 |

#### Observación

**No se abre ningún `DISC-XXX`**: no falta nada para completar TASK-013 —la composición única existe, TC-019 está en verde, `tsc` y Biome en verde, `REQUIRED_SCOPES` no se modifica y no se toca ningún artefacto aprobado. Sobre «la usan tanto el comando directo como la opción 4»: los dos disparadores se implementan después (TASK-014 coordinador, TASK-015 comando y TASK-016 opción 4, que dependen de esta tarea); TASK-013 los garantiza sin duplicación al exportar una única función de composición y al comprobar en TC-019 que ni `src/cli.ts` ni `src/cli-main.ts` ensamblan dependencias propias.

Nota de estado al cierre (2026-10-09, 18:54): la validación de «suite completa» de la tabla se ejecutó a las 18:49, cuando el repositorio tenía 22 ficheros y 196 pruebas en verde. Posteriormente la sesión paralela de **TASK-012** añadió `tests/presentation/prompts.test.ts` en su propia fase RED (23 pruebas en rojo porque `promptNombrePlaylist`, `promptVisibilidadPlaylist`, `interpretarConfirmacionS` y demás exportaciones aún no existen en `src/presentation/prompts.ts`), lo que hace que `npx vitest run` y `npx tsc -p tsconfig.type-tests.json --noEmit` fallen **solo** por ese fichero ajeno a TASK-013. Comprobación de aislamiento tras ese suceso: `npx vitest run tests/presentation/composicion-crear-playlist.test.ts tests/presentation/messages.test.ts tests/presentation/cli-main.test.ts` → exit 0 (29 pruebas) y `npx tsc --noEmit` → exit 0. TASK-013 no toca `prompts.ts` ni `prompts.test.ts` y no interfiere con TASK-012. Se mantienen las observaciones de línea base de las tareas anteriores: `npx biome check .` a nivel de repositorio reporta solo ficheros no tocados por esta feature (`dist/`, `package.json`, `.opencode/model-policy.json`) y `npx vitest run --coverage` sigue sin el dependiente `@vitest/coverage-v8` (pendiente de decisión del orquestador en TASK-020/TC-028). Los 2 ficheros de TASK-013 pasan `biome check` sin errores.

---

## TASK-012 — Presentation — peticiones, confirmaciones y elecciones

- **Fecha**: 2026-10-09
- **Trazabilidad**: `OBJ-001 → RF-001, RF-002, RNF-002, RNF-005 → UC-001, UC-001-A1, UC-001-E3 → AC-002, AC-003, AC-005 → TASK-012 → TC-018`
- **Estado**: completada (TC-018 en verde; suite completa, `tsc --noEmit` y Biome sin errores en los ficheros de la tarea)
- **Alcance respetado**: extensión de `src/presentation/prompts.ts` sobre el patrón `prompt`/`readline` existente, sin alterar `prompt`, `confirmExit`, `promptMenuChoice`, `promptClientId`, `promptRedirectUri` ni `closeReadline`; sin dependencias nuevas, sin artefactos aprobados tocados y sin commits

### TEST creado

- `tests/presentation/prompts.test.ts` — **TC-018**, 24 pruebas de ejecución en 7 grupos, con **entrada simulada por un doble de `readline`** (`crearLectorDoble`, implementación de `LectorEntrada` que consume respuestas programadas y registra los textos pedidos) y **sin teclado real**:
  1. **Peticiones literales de nombre y descripción (4 pruebas)**: la petición de nombre usa `MESSAGES.playlist.namePrompt` y devuelve el valor en bruto (el recorte es regla de Business, `SolicitudCreacion.nombre` es «sin recortar»); la de descripción usa `MESSAGES.playlist.descriptionPrompt`; `Enter` y solo espacios producen `"Playlist sin descripción"`.
  2. **Lista de visibilidad con pública preseleccionada (3 pruebas)**: la lista presenta `Pública (preseleccionada)` y `Privada`, `Enter` elige `publica` (equivalente a `--public`), `1` → `publica`, `2` → `privada`; una elección inválida repite la lista.
  3. **Confirmación final `(s/N): ` (3 pruebas)**: `FORMATO_CONFIRMACION === '(s/N): '` con espacio final; solo `s` en minúscula confirma (`S`, `N`, vacío, `no`, `Si` no confirman); la función devuelve la respuesta cruda para interpretarla con la convención.
  4. **Menú de duplicados aceptando únicamente 0, 1 y 2 (3 pruebas)**: usa `MESSAGES.playlist.duplicateMenu` carácter a carácter; `interpretarOpcionDuplicados` acepta solo `'0'`, `'1'`, `'2'` y devuelve `null` para `''`, `'3'`, `'x'`, `'01'`, `'s'`; una opción inválida repite el menú.
  5. **Pregunta de modificación (2 pruebas)**: usa `MESSAGES.playlist.modifyPrompt` carácter a carácter; `s` afirma y `N` no afirma vía `interpretarConfirmacionS`.
  6. **Funciones puras y mini-flujo (4 pruebas)**: `interpretarVisibilidad` con equivalencia a `--public`/`--private`; flujo completo con dobles de creación y registro donde `Enter` en descripción produce el valor por defecto y `s` confirma (crea y registra una vez); respuesta `N` cancela **sin crear ni registrar**.
  7. **`Ctrl+C` durante cualquier petición (5 pruebas)**: el aborto programado en la petición de nombre, descripción, visibilidad o confirmación produce desenlace `abortado` con **cero** llamadas de creación y de registro (N-002); el menú de duplicados y la pregunta de modificación también abortan ante `Ctrl+C`.

### Evidencia RED

`npx vitest run tests/presentation/prompts.test.ts` → **exit 1**

- `Test Files 1 failed (1)`, `Tests 23 failed | 1 passed (24)`.
- Fallos observados: `TypeError: promptNombrePlaylist is not a function`, `TypeError: promptVisibilidadPlaylist is not a function`, `TypeError: interpretarConfirmacionS is not a function`, etc., en todas las pruebas que invocan las funciones nuevas.
- La única prueba en verde en RED (`las elecciones puras no tienen estado ambiguo`) no depende de ninguna exportación nueva: solo construye un valor del tipo.
- Fallo por ausencia del comportamiento esperado (funciones de interpretación y peticiones aún no existentes), no por error de configuración accidental: el alias `@/` resuelve `@/presentation/prompts.js` y `vitest.config.ts` no se modificó.

### Implementación (GREEN)

- `src/presentation/prompts.ts` (único fichero de producción de la tarea, ampliado):
  - tipos de resultado de flujo: `EntradaPrompt` (`respondido`/`abortado`), `EleccionVisibilidad`, `OpcionDuplicados` (`'0' | '1' | '2'`) y `EleccionDuplicados`, sin estados ambiguos;
  - `LectorEntrada` como punto de inyección de la entrada (en pruebas se sustituye por un doble; en producción es `lectorReadline` sobre el `readline` singleton existente, cuya señal `SIGINT` —`Ctrl+C`— resuelve como `abortado`);
  - funciones puras de interpretación separadas de la lectura: `interpretarConfirmacionS` (solo `s` en minúscula, BR-007), `interpretarVisibilidad` (`Enter`/`1` → `publica`, `2` → `privada`, equivalente a `--public`/`--private`, BR-005) y `interpretarOpcionDuplicados` (únicamente `0`, `1`, `2`, UC-001-A1);
  - `FORMATO_CONFIRMACION = '(s/N): '` (AC-003, BR-007) y el texto de la lista de visibilidad con la pública preseleccionada (P-002);
  - peticiones que usan los literales de TASK-011 sin duplicarlos: `promptNombrePlaylist` (valor en bruto), `promptDescripcionPlaylist` (resuelve el valor por defecto con el predicado de Business `resolverDescripcionEfectiva`, sin decidir reglas en Presentation), `promptVisibilidadPlaylist`, `confirmarCreacion`, `promptOpcionDuplicados` y `promptModificarDescripcion`.

#### Decisión de diseño documentada (no es `DISC-XXX`)

El comportamiento está especificado (TASK-012, TC-018, P-002, P-004, BR-005, BR-007, N-002); solo se decidió cómo se codifica:

- El literal del **texto de la lista de visibilidad** no está fijado por la especificación: RNF-002/RTASK-011 fijan las peticiones, la pregunta de modificación, el menú de duplicados y el formato `(s/N): `, pero la lista solo se describe como «lista de visibilidad con pública preseleccionada» (AC-003, P-002). El texto elegido (`Visibilidad de la playlist: 1. Pública (preseleccionada) / 2. Privada / Elección [Enter = 1]: `) está en español estricto, marca la preselección y la equivalencia `Enter = 1`, y no contradice ningún literal aprobado.
- `Ctrl+C` se modela como `SIGINT` del `readline` que resuelve la lectura como `{ estado: 'abortado' }` (N-002: aborta sin crear ni registrar); el destino posterior al aborto (volver al menú) lo decide el coordinador en TASK-014, conforme a la nota N-002 de `TEST_PLAN.md`.
- `promptDescripcionPlaylist` delega en `resolverDescripcionEfectiva` (Business) para `Enter`/espacios: Presentation transporta la respuesta y no decide la regla de vacío (P-004), cumpliendo «Presentation sin reglas críticas».
- `promptNombrePlaylist` devuelve el valor **en bruto** porque `SolicitudCreacion.nombre` es «tal como lo aportó el usuario, sin recortar» (TASK-001); el recorte lo hace Business.

### Evidencia GREEN

`npx vitest run tests/presentation/prompts.test.ts` → **exit 0** — `Test Files 1 passed (1)`, `Tests 24 passed (24)`, `Type Errors no errors`.

### Refactorización

- Los dos bucles de reentrada idénticos (lista de visibilidad y menú de duplicados) quedaron unificados en el helper privado `pedirHastaValidar(lector, texto, interpretar)`, que repite hasta validar y propaga el aborto sin repetir; la lectura sobre `readline` quedó extraída a `leerConReadline`, con propagación del rechazo de `question` para no dejar la promesa colgada. Tras el refactor: mismas 24 pruebas en verde.
- Corrección de tipado de los dobles: los mocks `crear` y `registrar` pasan a `Mock<(entrada) => void>` y `Mock<() => void>` explícitos (la forma `ReturnType<typeof vi.fn>` producía `TypeCheckError` en el chequeo de tipos de pruebas); importaciones ordenadas y formato con `biome check --write`.

### Comprobación de no vaciedad (mutación temporal, revertida)

| Mutación temporal | Comando | Resultado |
| --- | --- | --- |
| `interpretarConfirmacionS` con `.toLowerCase()` (aceptaría `S`) | `npx vitest run tests/presentation/prompts.test.ts` | exit 1 — 1 fallo: `solo "s" en minúscula confirma; "S", "N", vacío u otra respuesta no confirman` (`expected false to be true`) |
| Revertir la mutación | `npx vitest run tests/presentation/prompts.test.ts` | exit 0 — 24/24 en verde |

### Validaciones ejecutadas

| Validación | Comando | Resultado |
| --- | --- | --- |
| RED de la tarea | `npx vitest run tests/presentation/prompts.test.ts` | exit 1 — 23 pruebas en fallo por funciones inexistentes (`... is not a function`) |
| TC-018 (GREEN, tras REFACTOR y al cierre) | `npx vitest run tests/presentation/prompts.test.ts` | exit 0 — 1 fichero, 24 pruebas, 0 errores de tipo |
| No vacuidad: mutación (`interpretarConfirmacionS`) | `npx vitest run tests/presentation/prompts.test.ts` | exit 1 — 1 fallo; revertida → exit 0 |
| Suite completa | `npx vitest run` | exit 0 — 23 ficheros, 220 pruebas, 0 errores de tipo (antes 22/196; +1 fichero y +24 pruebas de TC-018) |
| Compilación estricta | `npx tsc --noEmit` | exit 0 |
| Estática y formato de los ficheros tocados | `npx biome check src/presentation/prompts.ts tests/presentation/prompts.test.ts` | exit 0 — 2 ficheros, sin errores |
| Complejidad cognitiva < 15 | Regla `complexity/noExcessiveCognitiveComplexity` de Biome sin incidentes | Cumple |
| Sin `any` ni reglas de dominio en Presentation | `noExplicitAny` sin incidentes; la descripción delega en Business y la longitud/duplicados no se deciden aquí | Cumple |
| Entrada simulada sin teclado real | Doble de `LectorEntrada` en todas las pruebas de TC-018 | Cumple |
| Literales preexistentes intactos | TC-017 sigue en verde en la suite completa y las funciones previas de `prompts.ts` no se modificaron | Cumple |
| Pruebas de otras tareas intactas | `npx vitest run` y `git status --short -- src tests` | 220 pruebas en verde; sin cambios en ficheros de TASK-001 a TASK-011 ni en TASK-013 |

#### Observación

**No se abre ningún `DISC-XXX`**: no falta nada para completar TASK-012 —las peticiones, confirmaciones y elecciones existen con los literales aprobados de TASK-011 y el formato `(s/N): `, TC-018 está en verde con entrada simulada, `Enter` en descripción produce el valor por defecto, `tsc` y Biome en verde y no se modifica ningún artefacto aprobado. Sobre el texto de la lista de visibilidad: la especificación fija el comportamiento (pública preseleccionada, equivalente a `--public`) pero no su literal; queda documentado como decisión de diseño en este registro. Se mantienen las observaciones de línea base de las tareas anteriores: `npx biome check .` a nivel de repositorio reporta solo ficheros no tocados por esta feature (`dist/`, `package.json`, `.opencode/model-policy.json`) y `npx vitest run --coverage` sigue sin el dependiente `@vitest/coverage-v8` (pendiente de decisión del orquestador en TASK-020/TC-028). Los 2 ficheros de TASK-012 pasan `biome check` sin errores.

---

## TASK-014 — Presentation — coordinador del flujo de creación (reingresos, duplicados y confirmación)

- **Fecha**: 2026-10-09
- **Trazabilidad**: `DISC-002 → OBJ-001 → RF-001, RF-002, RNF-002, RNF-003, RNF-005 → UC-001, UC-001-A1, UC-001-E1, UC-001-E2, UC-001-E3 → AC-001, AC-003, AC-004, AC-005 → TASK-014 → TC-020`
- **Estado**: completada (TC-020 en verde; suite completa, `tsc --noEmit`, tipos de pruebas y Biome sin errores en los ficheros de la tarea)
- **Alcance respetado**: dos ficheros nuevos (`src/presentation/crear-playlist.ts` y su prueba); sin modificar `src/presentation/prompts.ts`, `src/presentation/messages.ts`, `src/presentation/composicion-crear-playlist.ts` ni ficheros de negocio, sin dependencias nuevas, sin artefactos aprobados tocados y sin commits

### TEST creado

- `tests/presentation/crear-playlist.test.ts` — **TC-020**, 25 pruebas de ejecución con **dobles del caso de uso y de las peticiones** y con la salida capturada mediante espía de `process.stdout.write` (sin terminal real):
  1. **Éxito interactivo completo (AC-001)**: con doble de caso de uso que invoca el canal y respuesta `s`, el coordinador pide nombre, descripción, visibilidad y confirmación en ese orden, presenta el literal único `Playlist creada: "Viaje 2026" (privada, descripción: "Carretera", id: pl-tc020, enlace: …)` con identificador y enlace, y la solicitud no lleva `duplicadoAceptado`.
  2. **Literales exactos por desenlace (AC-004, 6 pruebas parameterizadas)**: `sinSesion` → `No hay sesión activa. Conecta con Spotify con la opción 1`; `sesionCaducada` → `Sesión caducada. Vuelve a conectar con Spotify.`; `permisosInsuficientes` → `Permisos insuficientes para crear la playlist.`; `limiteAgotado` → `Vuelva a intentarlo más tarde`; `falloInesperado` → `No se pudo crear la playlist por un error inesperado.`; `errorValidacion` de visibilidad → `Se debe declarar flag único en comando --public o --private`, todos con finalización `error`.
  3. **Reingreso de longitud (UC-001-E3)**: `ErrorValidacion` de nombre muestra `Error en longitud del nombre de la playlist, mínimo 3, máximo 100 caracteres totales.`, repite la petición de nombre —conservando descripción y visibilidad— y reinvoca sin `duplicadoAceptado`.
  4. **Comando directo sin reingreso (P-001, N-001)**: con `entradaDirecta` y `confirmacionPreResuelta: true` el canal resuelve `confirmada` sin peticiones (cero llamadas a las peticiones) y se crea directamente; tras un reingreso de nombre, la confirmación pasa a solicitarse por el canal (secuencia `['nombre', 'confirmacion']`).
  5. **Menú de duplicados `1/2/0` (UC-001-A1, BR-006, 6 pruebas)**: muestra `Ya existe una playlist llamada "Viaje 2026".`; con `1` repite el nombre, pregunta `¿Deseas modificar descripción y visibilidad? (s/N): ` y reinvoca **sin** `duplicadoAceptado` (con `s` repite también descripción y visibilidad); con `2` reinvoca **con** `duplicadoAceptado: true` y la confirmación final va por el canal inyectado; con `0` muestra `Creación cancelada. No se creó ninguna playlist.` con **cero** invocaciones adicionales del caso de uso; `Ctrl+C` en el menú aborta sin el literal de cancelación.
  6. **Confirmación `(s/N): ` por el canal (BR-007, 5 pruebas)**: `N`, `S`, vacío, `Si` y `Ctrl+C` producen `cancelada` sin crear ni registrar, sin `Playlist creada:` ni cancelación literal en la salida.
  7. **Traducción de `Cancelado` y abortos**: `Cancelado` devuelto por Business produce retorno con finalización `cancelada` y **salida vacía** (sin registrar ni literales adicionales); `Ctrl+C` en la petición de nombre del menú aborta con **cero** invocaciones del caso de uso.
  8. **Revisión de imports y literales (RNF-003)**: el coordinador no importa de `src/data/`, no usa `node:fs`/`node:http`/`fetch(`/`process.`/llamadas directas a consola/`any`, no contiene `esLongitudValida`/`esDuplicadoPropio`/`withRetry`/`Retry-After`/`registroTecnico` (no decide reglas ni registra), usa `MESSAGES.playlist.*` sin duplicar literales aprobados y expone `peticionesDeTerminal` con las seis peticiones acopladas a los prompts de TASK-012.
- Dobles: **doble de caso de uso** (`CasoUsoCrearPlaylist` que registra las solicitudes y ejecuta comportamiento programado, con `invocarCanal` que simula a Business invocando `solicitud.canalConfirmacion()` —DISC-002— y devuelve éxito o `Cancelado`) y **doble de peticiones** (`PeticionesCreacion` que registra qué se pidió y consume respuestas programadas, con `ctrl+c` como aborto); sin red, sin disco y sin teclado real.

### Evidencia RED

`npx vitest run tests/presentation/crear-playlist.test.ts` → **exit 1**

- `Test Files 1 failed (1)`, `Tests no tests` (0 recogidas), `Type Errors no errors`.
- Fallo observado: `Error: Cannot find package '@/presentation/crear-playlist.js' imported from C:/Proyectos/spoty2/tests/presentation/crear-playlist.test.ts`.
- Fallo por ausencia del comportamiento esperado (coordinador inexistente), no por error de configuración accidental: el alias `@/` resuelve el resto de módulos en las suites existentes, `vitest.config.ts` no se modificó y no hubo errores de tipo. Línea base previa verificada: `npx vitest run` → exit 0 con 23 ficheros y 220 pruebas.

### Implementación (GREEN)

- `src/presentation/crear-playlist.ts` (nuevo, único fichero de producción de la tarea), adaptador delgado con el caso de uso y las peticiones inyectados:
  - `PeticionesCreacion` (las seis peticiones de TASK-012) más `peticionesDeTerminal`, que las acopla a los prompts reales sin `argv` ni `readline` propios (RNF-003);
  - `EntradaDirecta` (nombre, descripción opcional, visibilidad y `confirmacionPreResuelta`) y `CoordinadorCreacion` (`casoUso`, `peticiones`, `entradaDirecta` opcional) como API para TASK-015 (comando directo) y TASK-016 (opción 4);
  - `FinalizacionCreacion` (`creada` | `cancelada` | `error`) como retorno para el punto de entrada;
  - canal de confirmación construido por el coordinador (DISC-002): pre-resuelto en `confirmada` mientras no haya petición interactiva —comando directo válido sin reingreso— y `(s/N): ` por el canal en cualquier flujo interactivo, devolviendo `cancelada` ante `N`, otra respuesta o `Ctrl+C` (BR-007);
  - bucles de reingreso: `ErrorValidacion` de longitud repite la petición de nombre; el menú de duplicados `1/2/0` con ramas `1` (repite nombre y pregunta modificación, reinvoca sin `duplicadoAceptado`), `2` (reinvoca con `duplicadoAceptado: true` hacia la confirmación) y `0` (muestra `Creación cancelada. No se creó ninguna playlist.` sin invocar ni registrar);
  - traducción de desenlaces con los literales de `MESSAGES` (TASK-011): `Exito` con el mensaje único y cada literal de error por su desenlace; `Cancelado` en retorno al menú o fin del flujo sin registrar ni literales adicionales (UC-001, ARCHITECTURE §6.2, §6.4, §6.5, §6.7);
  - sin importaciones de `src/data/`, sin registro, sin efectos directos y sin reglas de dominio propias.

#### Decisión de diseño documentada (no es `DISC-XXX`)

El comportamiento está especificado; solo se decidió cómo se codifica:

- **Forma de inyección de las peticiones**: el coordinador recibe las seis peticiones como objeto `PeticionesCreacion` en lugar de importar los prompts directamente, porque TC-020 exige doblarlas (TEST_PLAN §9: «Presentation se prueba con dobles del caso de uso y de las peticiones»); `peticionesDeTerminal` es el acople de producción sobre TASK-012.
- **Estado de la confirmación en comando directo**: la distinción «pre-resuelta sin reingreso» se modela con la opción `confirmacionPreResuelta` de `EntradaDirecta` (cuyo uso decide TASK-015, conforme a TASK-014: «encargado de TASK-015») más el semáforo `canalPreResuelto`, que cualquier petición interactiva —reingreso, menú de duplicados, reinvocaciones— apaga para que la confirmación se solicite por el canal (N-001). Así la rama `2` de duplicados en comando directo también pide confirmación, como exige N-001.
- **Observación de la salida**: la presentación usa `showMessage`/`showError` con los decorados de `console.ts` (patrón existente de Presentation) y TC-020 verifica que el literal aprobado aparece íntegro en la salida; el espía de `process.stdout.write` solo observa, no altera el comportamiento.
- **Fin del flujo**: `FinalizacionCreacion` distingue `creada`, `cancelada` y `error` para que TASK-015 y TASK-016 decidan su retorno (código de salida o vuelta al menú) sin reabrir el flujo (N-002).

### Evidencia GREEN

`npx vitest run tests/presentation/crear-playlist.test.ts` → **exit 0** — `Test Files 1 passed (1)`, `Tests 25 passed (25)`, `Type Errors no errors`.

Nota de iteración dentro de GREEN: la primera ejecución quedó en 24/25 porque la comprobación de imports del coordinador usaba el patrón `console\.`, que daba falso positivo con el import legítimo `./console.js` (módulo de formato de Presentation, sin efectos). Se refinó **la aserción de la prueba** a `\bconsole\.(log|error|warn|info|debug)\s*\(`, que es el comportamiento realmente exigido (sin llamadas directas a consola); ninguna aserción de comportamiento se relajó y la implementación no cambió.

### Refactorización

- `npx biome check --write` sobre los 2 ficheros → 1 fichero corregido solo en formato (parte multilínea del tipo `PasoFlujo`, ancho de línea 100); sin cambios de comportamiento y TC-020 en verde tras el formato.
- Diseño: descomposición por desenlace exigida por la tarea — `evaluarDesenlace` (presentación por desenlace), `evaluarValidacion` (reingreso de longitud), `evaluarDuplicado` (menú `1/2/0`) y `modificarTrasDuplicado` (rama `1`)— sobre el bucle `ejecutarFlujoCreacion` con pasos `reinvocar`/`finalizar`; los helpers puros `finalizar`, `reinvocar`, `pedir` y `construirSolicitud` eliminan duplicación. La función más compleja es `modificarTrasDuplicado` con 6 puntos de complejidad cognitiva; muy por debajo de 15. Sin `any`, sin `console.*` directo y sin `process.` en producción.

### Comprobación de no vaciedad (mutación temporal, revertida)

SHA-256 del fichero de producción antes y después de la mutación: `45DAB182721E573138B47950769EFCEFB54A81D8619C43DAC7606176ACD7AA31` (idéntico, sin rastro de mutación).

| Mutación temporal | Comando | Resultado |
| --- | --- | --- |
| `resolverCanal` pierde la rama pre-resuelta (la confirmación siempre se solicita por petición) | `npx vitest run tests/presentation/crear-playlist.test.ts` | exit 1 — 1 fallo: `el comando directo válido sin reingreso usa el canal pre-resuelto en confirmada (P-001, N-001)` |
| Revertir la mutación y volver a TC-020 | `npx vitest run tests/presentation/crear-playlist.test.ts` | exit 0 — 25/25 en verde y SHA-256 idéntico al previo |

### Validaciones ejecutadas

| Validación | Comando | Resultado |
| --- | --- | --- |
| RED de la tarea | `npx vitest run tests/presentation/crear-playlist.test.ts` | exit 1 — fallo por coordinador inexistente (`Cannot find package '@/presentation/crear-playlist.js'`), 0 errores de tipo |
| TC-020 (GREEN, tras REFACTOR y al cierre) | `npx vitest run tests/presentation/crear-playlist.test.ts` | exit 0 — 1 fichero, 25 pruebas, 0 errores de tipo |
| No vacuidad: mutación (canal pre-resuelto) | `npx vitest run tests/presentation/crear-playlist.test.ts` | exit 1 — 1 fallo; revertida → exit 0 con SHA-256 idéntico |
| Suite completa | `npx vitest run` | exit 0 — 24 ficheros, 245 pruebas, 0 errores de tipo (antes 23/220; +1 fichero y +25 pruebas de TC-020) |
| Compilación estricta | `npx tsc --noEmit` | exit 0 |
| Tipos de pruebas | `npx tsc -p tsconfig.type-tests.json --noEmit` | exit 0 |
| Estática y formato de los ficheros tocados | `npx biome check src/presentation/crear-playlist.ts tests/presentation/crear-playlist.test.ts` | exit 0 — 2 ficheros, sin errores |
| Complejidad cognitiva < 15 | Regla `complexity/noExcessiveCognitiveComplexity` de Biome sin incidentes | Cumple |
| Sin `any` ni reglas de dominio en Presentation | `noExplicitAny` sin incidentes; TC-020 prueba 8: sin `esLongitudValida`/`esDuplicadoPropio`/`withRetry`/`Retry-After` ni decisiones propias | Cumple |
| Coordinador sin `src/data` ni efectos directos | TC-020 prueba 8: sin imports de Data, sin `node:fs`/`node:http`/`fetch(`/`process.`, sin llamadas directas a consola, sin registro | Cumple |
| Literales sin duplicar (RNF-002) | TC-020 prueba 8: fuente con `MESSAGES.playlist.*` y sin literales aprobados incrustados | Cumple |
| Pruebas de otras tareas intactas | `npx vitest run` y `git status --short -- src tests` | 245 pruebas en verde; solo los 2 ficheros nuevos de TASK-014; sin cambios en ficheros de TASK-001 a TASK-013 |

#### Observación

**No se abre ningún `DISC-XXX`**: no falta nada para completar TASK-014 —el coordinador existe con el caso de uso y las peticiones inyectadas, construye la solicitud con el canal de confirmación (pre-resuelto en comando directo válido sin reingreso, petición `(s/N): ` en todo flujo interactivo) y con `duplicadoAceptado` solo cuando procede, presenta el éxito y cada literal exacto de TASK-011 según el desenlace, gestiona el reingreso de longitud y el menú `1/2/0` con sus tres ramas, traduce `Cancelado` sin registrar ni literales adicionales, TC-020 está en verde con dobles, `tsc` y Biome en verde y no se modifica ningún artefacto aprobado. Sobre el alcance de los disparadores: TASK-015 (comando directo) y TASK-016 (opción 4) se implementan después y delegarán en `ejecutarFlujoCreacion` con los mismos tipos; el coordinador no pre-comprueba sesión porque Business la resuelve como desenlace `SinSesion` y su presentación queda cubierta aquí (UC-001-E1, §6.6). Se mantienen las observaciones de línea base de las tareas anteriores: `npx biome check .` a nivel de repositorio reporta solo ficheros no tocados por esta feature (`dist/`, `package.json`, `.opencode/model-policy.json`) y `npx vitest run --coverage` sigue sin el dependiente `@vitest/coverage-v8` (pendiente de decisión del orquestador en TASK-020/TC-028). Los 2 ficheros de TASK-014 pasan `biome check` sin errores.

## TASK-015 — Presentation — comando directo `spoty create-new-playlist`

- **Fecha**: 2026-10-09
- **Trazabilidad**: `OBJ-001 → RF-001, RF-002, RNF-002, RNF-003, RNF-005 → UC-001, UC-001-E3 → AC-002, AC-005 → TASK-015 → TC-021`
- **Estado**: completada (TC-021 en verde; suite completa, `tsc --noEmit`, tipos de pruebas y Biome sin errores en los ficheros de la tarea)
- **Alcance respetado**: dos ficheros nuevos (`src/presentation/comando-crear-playlist.ts` y su prueba) más el alta del comando en `src/cli-main.ts` (case en `handleCommand` y una línea de ayuda); sin modificar `src/presentation/crear-playlist.ts`, `src/presentation/composicion-crear-playlist.ts`, `src/presentation/prompts.ts`, `src/presentation/messages.ts` ni ficheros de negocio o de datos, sin dependencias nuevas, sin artefactos aprobados tocados, sin commits y sin cambiar de rama

### TEST creado

- `tests/presentation/comando-crear-playlist.test.ts` — **TC-021**, 11 pruebas de ejecución con **doble de caso de uso** (mock de la composición de TASK-013), **doble de `readline`** (patrón de TC-018: registra las peticiones reales de los prompts de TASK-012 y consume respuestas programadas) y salida capturada mediante espía de `process.stdout.write` (sin terminal real); la prueba invoca `handleCommand('create-new-playlist', …)`, de modo que el alto del comando queda verificado como punto de entrada funcional:
  1. **Los 4 ejemplos aprobados (AC-002, P-001, 4 pruebas)**: `--name "Viaje 2026" --private`; con `--private --description "Carretera"`; con `--public --description "Carretera"`; y `--public` con descripción por defecto. Cada ejemplo inicia el flujo con nombre, descripción y visibilidad esperados (la ausente se resuelve como `"Playlist sin descripción"` con el predicado de Business), sin `duplicadoAceptado`, presentando el literal único de éxito con identificador y enlace, con código de salida `0` y **cero peticiones interactivas**: crea directamente con el canal pre-resuelto en `confirmada` (P-001, N-001, ARCHITECTURE §6.1).
  2. **Visibilidad ausente o doble (AC-002, §6.3, 3 pruebas)**: fija los literales aprobados (`Se debe declarar flag único en comando --public o --private`, `Error en longitud del nombre de la playlist, mínimo 3, máximo 100 caracteres totales.` y `Nombre de la playlist (3-100 caracteres):` —RNF-002—); con `--name "Viaje 2026"` sin indicador la solicitud lleva `visibilidad: 'ausente'` y con `--public --private` lleva `'doble'` (el comando traduce indicadores y Business decide, BR-005), se presenta el literal de flag único, el código de salida es `1` y no continúa hasta corregir la invocación (cero peticiones interactivas).
  3. **Nombre ausente o fuera de 3-100 (AC-005, UC-001-E3, §6.2, 3 pruebas)**: nombre ausente (`--public` sin `--name`), de 2 y de 101 caracteres visibles. Business (doble) rechaza, se presenta `Error en longitud del nombre de la playlist, mínimo 3, máximo 100 caracteres totales.` y el flujo continúa en interactivo con la petición literal `Nombre de la playlist (3-100 caracteres):`; tras el reingreso con `Viaje Nuevo` la confirmación se solicita por el canal (`(s/N): `, secuencia exacta `[namePrompt, FORMATO_CONFIRMACION]`, N-001), se reinvoca conservando descripción por defecto y visibilidad sin `duplicadoAceptado` y se presenta el éxito con código `0`.
  4. **Sin reglas propias (RNF-003, 1 prueba)**: la fuente de `comando-crear-playlist.ts` no contiene `esLongitudValida`/`esDuplicadoPropio`/`resolverVisibilidad`/`recortarNombre`/`withRetry`, no importa de `src/data/`, no usa `node:fs`/`node:http`/`fetch(`/`process.`/llamadas directas a consola/`any`, no incrusta los literales aprobados, y delega en `componerCrearPlaylistVacia` (TASK-013), `ejecutarFlujoCreacion` con `peticionesDeTerminal` (TASK-014) y `resolverDescripcionEfectiva` (TASK-005) con `confirmacionPreResuelta: true`; `src/cli-main.ts` contiene el alta `case 'create-new-playlist'` con `ejecutarComandoCrearPlaylist`.

### Evidencia RED

`npx vitest run tests/presentation/comando-crear-playlist.test.ts` → **exit 1**

- `Test Files 1 failed (1)`, `Tests 10 failed | 1 passed (11)`, `Type Errors no errors`.
- Fallos observados por ausencia del comportamiento esperado, no por configuración accidental: `handleCommand('create-new-playlist', …)` devuelve `-1` (comando no registrado) en los 9 ejemplos y rechazos, y `ENOENT` al leer `src/presentation/comando-crear-playlist.ts` en la comprobación de imports (módulo del analizador inexistente). La única prueba en verde fija literales aprobados de `MESSAGES` (comportamiento ya existente de TASK-011).
- Línea base previa verificada antes de empezar: `npx vitest run` → exit 0 con 24 ficheros y 245 pruebas.

### Implementación (GREEN)

- `src/presentation/comando-crear-playlist.ts` (nuevo, único módulo de producción nuevo de la tarea):
  - `analizarEntradaDirecta(argumentos)` traduce `--name`, `--description`, `--public` y `--private` a la `EntradaDirecta` del coordinador: nombre en bruto —ausente como cadena vacía, rechazable por Business (BR-004)—, descripción resuelta con el predicado de Business (valor por defecto aprobado cuando falta `--description`), `EntradaVisibilidad` resultante de la presencia de indicadores (`publica`, `privada`, `ausente`, `doble`) sin decidir su validez (BR-005) y `confirmacionPreResuelta: true` del disparador de comando directo (P-001, N-001, DISC-002);
  - `ejecutarComandoCrearPlaylist(argumentos)` compone el caso de uso real (TASK-013) con `peticionesDeTerminal` y delega en `ejecutarFlujoCreacion` del coordinador TASK-014, con los mismos tipos que la vía de menú (RNF-003);
  - sin reglas de validación ni de duplicados propias, sin registro, sin efectos secundarios directos y sin literales aprobados incrustados (los desenlaces y sus literales los gestiona el coordinador con `MESSAGES`).
- `src/cli-main.ts` (alta del punto de entrada): `case 'create-new-playlist'` en `handleCommand` que invoca `ejecutarComandoCrearPlaylist(args)` y devuelve `0` para `creada` y `cancelada` y `1` para `error`; más una línea del comando en `showHelp` (ayuda descriptiva en español, sin alterar literales existentes).

#### Decisión de diseño documentada (no es `DISC-XXX`)

El comportamiento está especificado en P-001, AC-002, AC-005, UC-001-E3 y ARCHITECTURE §6.1-§6.3; solo se decidió cómo se codifica:

- **Descripción por defecto en el analizador**: la ausencia de `--description` se resuelve con `resolverDescripcionEfectiva` de Business —el mismo predicado que usa la petición interactiva de TASK-012— en lugar de dejar `undefined` para que Business la resuelva después, porque TASK-015 exige que «los 4 ejemplos aprobados *inician el flujo* con la descripción por defecto» y así es observable en la solicitud sin que el comando posea regla ni literal propio.
- **Códigos de salida**: siguiendo el patrón existente de `download-songs` (`ok ? 0 : 1`) y el manejo de cancelaciones de `handleCommand` (que ya devuelve `0`), `creada` y `cancelada` devuelven `0` y `error` devuelve `1`; la especificación no fija códigos numéricos y no se comporta de otro modo observable.
- **Visibilidad ausente o doble**: el comando no la rechaza por sí mismo: traduce los indicadores a `ausente`/`doble` en la solicitud y Business produce `ErrorValidacion` de visibilidad (BR-005, §6.3), del modo que el coordinador presenta `Se debe declarar flag único en comando --public o --private` y finaliza sin continuar —lo verifican TC-007/TC-010 en Business y TC-020 en el coordinador—, cumpliendo «sin decidir reglas de dominio» y «sin duplicar validación».
- **Soporte de indicadores**: se implementan únicamente las formas documentadas `--name <valor>`, `--description <valor>`, `--public` y `--private`; los argumentos no reconocidos se ignoran porque la especificación no define rechazo de banderas desconocidas y no se inventa comportamiento adicional.

### Evidencia GREEN

`npx vitest run tests/presentation/comando-crear-playlist.test.ts` → **exit 0** — `Test Files 1 passed (1)`, `Tests 11 passed (11)`, `Type Errors no errors`.

### Refactorización

- `npx biome check --write` sobre los 3 ficheros → 1 corrección solo de formato en la prueba (línea del patrón de regex de la comprobación de imports, ancho de línea 100); sin cambios de comportamiento y TC-021 en verde tras el formato.
- Diseño: el módulo queda descompuesto en analizadores pequeños —`leerValor` (valor del indicador), `leerVisibilidad` (traducción de presencia a `EntradaVisibilidad`), `analizarEntradaDirecta` (entrada para el coordinador) y `ejecutarComandoCrearPlaylist` (delegación)—, todos por debajo de 2 puntos de complejidad cognitiva, muy lejos del umbral de 15. Sin `any`, sin `console.*` directo y sin `process.` en producción.

### Comprobación de no vaciedad (mutaciones temporales, revertidas)

SHA-256 del fichero de producción antes y después de las mutaciones: `7C7EA1AC2277EAB988DF2172B2FF0EBCB926F082EBF93AF490303B0F1EBEEDEC` (idéntico, sin rastro de mutación).

| Mutación temporal | Comando | Resultado |
| --- | --- | --- |
| `confirmacionPreResuelta` pasa a `false` (el comando directo pediría confirmación) | `npx vitest run tests/presentation/comando-crear-playlist.test.ts` | exit 1 — 5 fallos: los 4 ejemplos aprobados y la comprobación de delegación |
| Revertir y ramificar la doble presencia como `'publica'` (sin detección de `'doble'`) | `npx vitest run tests/presentation/comando-crear-playlist.test.ts` | exit 1 — 1 fallo: `con visibilidad doble el comando traduce los indicadores y Business decide` |
| Revertir ambas mutaciones y volver a TC-021 | `npx vitest run tests/presentation/comando-crear-playlist.test.ts` | exit 0 — 11/11 en verde y SHA-256 idéntico al previo |

### Validaciones ejecutadas

| Validación | Comando | Resultado |
| --- | --- | --- |
| RED de la tarea | `npx vitest run tests/presentation/comando-crear-playlist.test.ts` | exit 1 — 10 fallos por comando no registrado (`-1`) y módulo inexistente (`ENOENT`), 0 errores de tipo |
| TC-021 (GREEN, tras REFACTOR y al cierre) | `npx vitest run tests/presentation/comando-crear-playlist.test.ts` | exit 0 — 1 fichero, 11 pruebas, 0 errores de tipo |
| No vacuidad: mutaciones (canal pre-resuelto y detección de doble) | `npx vitest run tests/presentation/comando-crear-playlist.test.ts` | exit 1 — 5 fallos y 1 fallo respectivamente; revertidas → exit 0 con SHA-256 idéntico |
| Suite completa | `npx vitest run` | exit 0 — 25 ficheros, 256 pruebas, 0 errores de tipo (antes 24/245; +1 fichero y +11 pruebas de TC-021) |
| Compilación estricta | `npx tsc --noEmit` | exit 0 |
| Tipos de pruebas | `npx tsc -p tsconfig.type-tests.json --noEmit` | exit 0 |
| Estática y formato de los ficheros tocados | `npx biome check src/presentation/comando-crear-playlist.ts src/cli-main.ts tests/presentation/comando-crear-playlist.test.ts` | exit 0 — 3 ficheros, sin errores |
| Complejidad cognitiva < 15 | Regla `complexity/noExcessiveCognitiveComplexity` de Biome sin incidentes | Cumple |
| Sin `any` ni reglas de dominio en el comando | `noExplicitAny` sin incidentes; TC-021 prueba de fuente: sin `esLongitudValida`/`esDuplicadoPropio`/`resolverVisibilidad`/`recortarNombre`/`withRetry` ni decisiones propias | Cumple |
| Comando sin `src/data` ni efectos directos | TC-021 prueba de fuente: sin imports de Data, sin `node:fs`/`node:http`/`fetch(`/`process.`, sin llamadas directas a consola | Cumple |
| Literales sin duplicar (RNF-002) | TC-021 prueba de fuente: sin literales aprobados incrustados; los literales salen del coordinador con `MESSAGES` (TASK-011) | Cumple |
| Pruebas de otras tareas intactas | `npx vitest run` y `git status --short -- src tests` | 256 pruebas en verde; sin cambios en ficheros de TASK-001 a TASK-014 (los ficheros `M` de la lista corresponden a la línea base previa de la rama) |

#### Observación

**No se abre ningún `DISC-XXX`**: no falta nada para completar TASK-015 —el comando `spoty create-new-playlist` está registrado en `handleCommand` como punto de entrada funcional, analiza `--name`, `--description`, `--public` y `--private` sin decidir reglas de dominio, los 4 ejemplos aprobados inician el flujo con la descripción por defecto y crean directamente sin confirmación (P-001, AC-002, §6.1), la visibilidad ausente o doble produce `Se debe declarar flag único en comando --public o --private` sin continuar (AC-002, §6.3 vía Business y coordinador), el nombre ausente o fuera de 3-100 produce `Error en longitud del nombre de la playlist, mínimo 3, máximo 100 caracteres totales.` y continúa en interactivo con `Nombre de la playlist (3-100 caracteres):` —sí pidiendo confirmación tras el reingreso (AC-005, UC-001-E3, §6.2, N-001)—, la delegación es en el coordinador TASK-014 con los mismos tipos que la vía de menú, TC-021 está en verde con dobles, `tsc` y Biome en verde y no se modifica ningún artefacto aprobado. Se mantienen las observaciones de línea base de las tareas anteriores: `npx biome check .` a nivel de repositorio reporta solo ficheros no tocados por esta feature (`dist/`, `package.json`, `.opencode/model-policy.json`) y `npx vitest run --coverage` sigue sin el dependiente `@vitest/coverage-v8` (pendiente de decisión del orquestador en TASK-020/TC-028). Los 3 ficheros de TASK-015 pasan `biome check` sin errores.

## TASK-016 — Presentation — opción `4. Crear playlist vacía` del menú interactivo

- **Fecha**: 2026-10-09
- **Trazabilidad**: `OBJ-001 → RF-001, RF-002, RNF-002 → UC-001 → AC-003 → TASK-016 → TC-022`
- **Estado**: completada (TC-022 en verde; suite completa, `tsc --noEmit`, tipos de pruebas y Biome sin errores en los ficheros de la tarea)
- **Alcance respetado**: dos ficheros de producción modificados (`src/cli-main.ts` y `src/presentation/prompts.ts`) más la prueba nueva `tests/presentation/menu-crear-playlist.test.ts`; sin tocar `src/presentation/messages.ts` (TASK-011), `src/presentation/prompts.ts` fuera del selector y las etiquetas, `src/presentation/crear-playlist.ts` (TASK-014), `src/presentation/composicion-crear-playlist.ts` (TASK-013), ningún fichero de negocio o de datos, sin dependencias nuevas, sin artefactos aprobados tocados, sin commits y sin cambiar de rama

### TEST creado

- `tests/presentation/menu-crear-playlist.test.ts` — **TC-022**, 8 pruebas de integración del modo interactivo con **doble de `readline`** (patrón de TC-018 ampliado con la señal `SIGINT` simulada: `question` dispara los escuchadores registrados por `once` y, si no hay ninguno, falla en lugar de colgar), **doble de la composición de TASK-013** (caso de uso inyectado), **doble del flujo de autenticación** (la opción 1 encuentra sesión vigente sin abrir navegador) y salida capturada mediante espía de `process.stdout.write` (sin teclado real, sin red real y con `SPOTY_TOKENS_FILE`/`SPOTY_LOG_FILE` en directorio temporal):
  1. **Menú y ayuda (AC-003, RNF-002, 1 prueba)**: el menú presenta `1. Conectar con Spotify`, `2. Ver estado de conexión`, `3. Descargar biblioteca`, `4. Crear playlist vacía`, `9. Cerrar sesión` y `0. Salir`, con la ayuda literal `(navega con 0-4,9, Ctrl+C para cancelar)` y sin la ayuda anterior `0-3,9`.
  2. **Opción 4 hacia el coordinador con peticiones y confirmación interactiva (AC-003, N-001, 1 prueba)**: la secuencia de peticiones es exactamente el selector, `Nombre de la playlist (3-100 caracteres):`, `Descripción (opcional, Enter para usar "Playlist sin descripción"):`, la lista de visibilidad con `Pública (preseleccionada)` y `(s/N): `; la solicitud lleva el nombre, la descripción por defecto y `visibilidad: 'publica'`, sin `duplicadoAceptado`; se presenta el literal único de éxito con identificador y enlace, la ayuda del menú y el retorno `Volviendo al menú principal...`, con salida `0`.
  3. **Confirmación distinta de `s` (AC-003, 1 prueba)**: con `N` el canal devuelve `cancelada`, la solicitud se invoca una sola vez, no se crea nada, y el flujo vuelve al menú (2 apariciones de `Menú Principal`) sin literales de éxito.
  4. **`Ctrl+C` en cualquier petición (AC-003, N-002, 2 pruebas)**: en la petición de nombre aborta sin invocar el caso de uso; en la confirmación final cancela tras una única invocación; en ambos casos no se crea nada y se vuelve al menú.
  5. **Opciones `1`, `2`, `3`, `9` y `0` conservan su comportamiento (1 prueba)**: `1` enruta a `handleCommand('connect')` con la sesión vigente (`Sesión activa: Usuaria TC-022 (tc022@example.test)`, llamada de comprobación de sesión contada), `2` presenta el literal de configuración requerida sin sesión, `3` presenta el aviso `Primero debes conectar con Spotify usando la opción 1.`, `9` pregunta con su literal y cancela ante `n` mostrando `Cancelado.`, `0` pregunta con su confirmación y sale con `¡Hasta luego!`; 5 iteraciones de menú y salida `0`.
  6. **Etiquetas del selector con la numeración real (N-004, 1 prueba)**: para `1`, `2`, `3`, `4`, `9` y `0` la flecha `→` muestra exactamente el texto del ítem del menú correspondiente sin su número (`Conectar con Spotify`, `Ver estado de conexión`, `Descargar biblioteca`, `Crear playlist vacía`, `Cerrar sesión`, `Salir`) y el selector registrado es `\nSelecciona una opción (0-4,9): `.
  7. **Delegación y fuente única de literales (RNF-002, RNF-003, 1 prueba)**: la fuente de `src/cli-main.ts` contiene `case '4'`, `ejecutarFlujoCreacion`, `peticionesDeTerminal`, `componerCrearPlaylistVacia`, `MESSAGES.menu.createPlaylist` y `MESSAGES.menu.hintCreatePlaylist`; no contiene entrada directa ni canal pre-resuelto, ni el literal del ítem `4. Crear playlist vacía`, ni imports de `src/data/`, ni `any`; la fuente de `src/presentation/prompts.ts` no contiene la numeración anterior `0-5` ni literales de etiquetas propios.

### Evidencia RED

`npx vitest run tests/presentation/menu-crear-playlist.test.ts` → **exit 1**

- `Test Files 1 failed (1)`, `Tests 7 failed | 1 passed (8)`, `Type Errors no errors`.
- Fallos por ausencia del comportamiento esperado, no por configuración accidental: el menú no mostraba el ítem de creación y la ayuda seguía diciendo `0-3,9`; la opción `4` caía en `Opción inválida` y no había ruta hacia el coordinador (0 invocaciones del caso de uso); `Ctrl+C` durante las peticiones de creación no tenía escuchador y el doble lo reportaba explícitamente; las etiquetas apuntaban a `4`/`5` de la numeración antigua y el selector seguía en `0-5`; la comprobación de fuente no encontraba `case '4'`. La única prueba en verde fija el comportamiento preexistente de las opciones `1`, `2`, `3`, `9` y `0`.
- Línea base previa verificada antes de empezar: `npx vitest run` → exit 0 con 25 ficheros y 256 pruebas.

### Implementación (GREEN)

- `src/cli-main.ts`:
  - `showMenu` añade `MESSAGES.menu.createPlaylist` (`4. Crear playlist vacía`) después de la descarga y la ayuda pasa a `MESSAGES.menu.hintCreatePlaylist` (`(navega con 0-4,9, Ctrl+C para cancelar)`); el resto de ítems no cambia;
  - nueva función `iniciarCreacionDesdeMenu()` que invoca `ejecutarFlujoCreacion` con `casoUso: componerCrearPlaylistVacia()` (composición TASK-013) y `peticiones: peticionesDeTerminal` (prompts TASK-012), **sin `entradaDirecta`**, de modo que la confirmación final se solicita por el canal en el flujo interactivo (N-001, DISC-002);
  - `runInteractiveMode` gana el `case '4'` que llama a esa función y conserva sin cambios los casos `1`, `2`, `3`, `9`, `0` y el bloque de retorno al menú (que aplica a `4` igual que a `1` y `2`).
- `src/presentation/prompts.ts`:
  - `SELECTOR_MENU = '\nSelecciona una opción (0-4,9): '`, alineado con la numeración real (N-004);
  - `ITEMS_MENU` derivado de los ítems de `MESSAGES.menu` (TASK-011) y `etiquetaDeItem()` que retira el prefijo numérico: la etiqueta junto a la elección sale de la misma fuente que la línea del menú, con lo que `3`, `4`, `9` y `0` quedan coherentes y desaparece la lista de etiquetas desalineada (`4`/`5`).

#### Decisiones de diseño documentadas (no son `DISC-XXX`)

El comportamiento está especificado en P-002, AC-003, N-001, N-004, UC-001 paso 5, `ARCHITECTURE.md` §6.4 y `TASKS.md` TASK-016; solo se decidió cómo se codifica:

- **Texto del selector**: la especificación fija la ayuda del menú (`0-4,9`) pero no fija el texto del selector; se alinea con la misma numeración real (`0-4,9`) por el criterio de alcance N-004, conservando el resto del formato `\nSelecciona una opción (…): ` preexistente.
- **Fuente única de etiquetas**: en lugar de corregir a mano la lista de etiquetas de `promptMenuChoice`, la lista se deriva de `MESSAGES.menu`, de modo que la coherencia que exige TC-022/N-004 no pueda volver a romperse sin romper la prueba.
- **Retorno al menú tras la opción 4**: se conserva el bloque existente de retorno (`Volviendo al menú principal...`) aplicado también a `4`, igual que a `1` y `2`; cualquier desenlace del coordinador (creada, cancelada o error ya presentado) retorna al menú, conforme a UC-001 paso 5 y `ARCHITECTURE.md` §6.4.
- **Ayuda antigua `MESSAGES.menu.hint`**: no se elimina ni se reescribe porque TC-017 (TASK-011) fija los literales preexistentes carácter a carácter; el menú pasa a mostrar `hintCreatePlaylist` y `hint` queda sin uso en producción, sin efecto observable.

### Evidencia GREEN

`npx vitest run tests/presentation/menu-crear-playlist.test.ts` → **exit 0** — `Test Files 1 passed (1)`, `Tests 8 passed (8)`, `Type Errors no errors`.

### Refactorización

- La unificación de la fuente de etiquetas —el refactor previsto en el TDD de la tarea— se incorporó en la implementación mínima porque la coherencia que exige TC-022 solo se cumple con una única fuente; tras GREEN se ejecutó el paso REFACTOR completo sin cambio de comportamiento:
  - `npx biome check --write` sobre los 3 ficheros → sin correcciones pendientes (ya formateados y sin errores de lint);
  - en la prueba se fusionaron `crearDobleCasoUso` e `instalarCasoUso` en un único `instalarCasoUso` (menos indirección, misma conducta) y se aclaró el contador de iteraciones de menú (`Menú Principal` en lugar del texto del selector);
  - complejidad cognitiva por función muy por debajo de 15 (`showMenu` 1, `iniciarCreacionDesdeMenu` 1, `runInteractiveMode` por debajo del umbral de la regla de Biome, `promptMenuChoice` 1, `etiquetaDeItem` 1); sin `any`, sin `console.*` directos y sin imports de `src/data/` en `cli-main.ts`;
  - TC-022 y la suite completa re-ejecutadas en verde tras el refactor.

### Comprobación de no vaciedad (mutaciones temporales, revertidas)

SHA-256 de los ficheros de producción antes y después de las mutaciones: `src/cli-main.ts` → `5BE220549C13A58B0C737C7516C85C6548675EB8B084A7D620A3D2507E0C23BB` y `src/presentation/prompts.ts` → `0EDE6189F892034C29155F9278FEAAF6B6C41E28CD801C890918CDA234FAB6AB` (idénticos antes y después, sin rastro de mutación).

| Mutación temporal | Comando | Resultado |
| --- | --- | --- |
| Ayuda revertida a `MESSAGES.menu.hint` y selector a `(0-5)` | `npx vitest run tests/presentation/menu-crear-playlist.test.ts` | exit 1 — 4 fallos: menú/ayuda, peticiones de la opción 4, etiquetas del selector y comprobación de fuente |
| `case '4'` sin ruta (vacío, sin invocar al coordinador) | `npx vitest run tests/presentation/menu-crear-playlist.test.ts` | exit 1 — 4 fallos: creación con confirmación, confirmación `N`, `Ctrl+C` en nombre y `Ctrl+C` en confirmación |
| Etiqueta de la opción `9` apuntando al ítem de salida en vez del de cierre de sesión | `npx vitest run tests/presentation/menu-crear-playlist.test.ts` | exit 1 — 1 fallo: `las etiquetas del selector coinciden con la numeración real del menú (N-004)` |
| Revertir las tres mutaciones y volver a TC-022 y a la suite | `npx vitest run tests/presentation/menu-crear-playlist.test.ts` y `npx vitest run` | exit 0 — 8/8 y 264/264 en verde, con SHA-256 idénticos a los previos |

### Validaciones ejecutadas

| Validación | Comando | Resultado |
| --- | --- | --- |
| RED de la tarea | `npx vitest run tests/presentation/menu-crear-playlist.test.ts` | exit 1 — 7 fallos por comportamiento ausente (menú sin ítem, ayuda `0-3,9`, sin ruta de la opción `4`, etiquetas y selector desalineados, `Ctrl+C` no manejado), 0 errores de tipo |
| TC-022 (GREEN, tras REFACTOR y al cierre) | `npx vitest run tests/presentation/menu-crear-playlist.test.ts` | exit 0 — 1 fichero, 8 pruebas, 0 errores de tipo |
| No vacuidad: mutaciones (ayuda/selector, ruta de la opción 4 y etiqueta de `9`) | `npx vitest run tests/presentation/menu-crear-playlist.test.ts` | exit 1 — 4, 4 y 1 fallos respectivamente; revertidas → exit 0 con SHA-256 idénticos |
| Suite completa | `npx vitest run` | exit 0 — 26 ficheros, 264 pruebas, 0 errores de tipo (antes 25/256; +1 fichero y +8 pruebas de TC-022) |
| Compilación estricta | `npx tsc --noEmit` | exit 0 |
| Tipos de pruebas | `npx tsc -p tsconfig.type-tests.json --noEmit` | exit 0 |
| Estática y formato de los ficheros tocados | `npx biome check src/cli-main.ts src/presentation/prompts.ts tests/presentation/menu-crear-playlist.test.ts` | exit 0 — 3 ficheros, sin errores |
| Complejidad cognitiva < 15 | Regla `complexity/noExcessiveCognitiveComplexity` de Biome sin incidentes | Cumple |
| Sin `any` ni efectos directos en la ruta de la opción 4 | `noExplicitAny` sin incidentes; TC-022 prueba de fuente: `cli-main.ts` sin imports de `src/data/`, sin entrada directa ni canal pre-resuelto | Cumple |
| Literales desde MESSAGES (RNF-002, N-004) | TC-022 prueba de fuente: ítem y ayuda desde `MESSAGES.menu.*` en `cli-main.ts`; etiquetas derivadas de los ítems del menú en `prompts.ts`, sin la numeración antigua `0-5` | Cumple |
| Pruebas de otras tareas intactas | `npx vitest run` y `git status --short -- src tests` | 264 pruebas en verde; los ficheros `M`/`??` de la lista corresponden a la línea base de la rama (los únicos cambios de esta tarea son `src/cli-main.ts`, `src/presentation/prompts.ts` y el fichero de prueba nuevo) |

#### Observación

**No se abre ningún `DISC-XXX`**: no falta nada para completar TASK-016 —el menú muestra `4. Crear playlist vacía` con la ayuda literal `(navega con 0-4,9, Ctrl+C para cancelar)`, la opción `4` enruta al coordinador TASK-014 con las peticiones de TASK-012 y con la confirmación solicitada en el flujo interactivo (N-001), las opciones `1`, `2`, `3`, `9` y `0` conservan su comportamiento, las etiquetas y el selector quedan alineados con la numeración real `0-4,9` (N-004), AC-003 queda cubierto en TC-022 con ayuda literal, peticiones, visibilidad preseleccionada, confirmación y `Ctrl+C`, TC-022 está en verde, la suite completa pasa de 25/256 a 26/264 en verde, y `tsc --noEmit`, los tipos de pruebas y Biome sobre los 3 ficheros tocados terminan en `0`. Se mantienen las observaciones de línea base de las tareas anteriores: `npx biome check .` a nivel de repositorio reporta solo ficheros no tocados por esta feature (`dist/`, `package.json`, `.opencode/model-policy.json`) y `npx vitest run --coverage` sigue sin el dependiente `@vitest/coverage-v8` (pendiente de decisión del orquestador en TASK-020/TC-028).

---

## TASK-017 — Integración — arnés de extremo a extremo con Spotify simulado

- **Fecha**: 2026-10-09
- **Trazabilidad**: `OBJ-001 → RF-001, RF-002, RNF-001, RNF-004 → UC-001 → AC-001, AC-002, AC-003, AC-004, AC-005 → TASK-017 → TC-023`
- **Estado**: completada (TC-023 en verde; suite completa, `tsc --noEmit`, tipos de pruebas y Biome sin errores en los ficheros de la tarea)
- **Alcance respetado**: dos ficheros de prueba nuevos (`tests/helpers/arnes-e2e.ts` y `tests/integration/arnes-e2e.test.ts`) más el `include` de `tsconfig.type-tests.json` ampliado con `tests/helpers/**/*.ts` e `tests/integration/**/*.ts`; **cero ficheros de producción modificados** (las mutaciones de no vaciedad quedaron revertidas con SHA-256 idénticos), sin dependencias nuevas, sin artefactos aprobados tocados (`TASKS.md` y `TEST_PLAN.md` conservan TASK-017 y TC-023 en sus estados originales), sin commits y sin cambiar de rama

### TEST creado

- `tests/integration/arnes-e2e.test.ts` — **TC-023**, 6 pruebas de integración de extremo a extremo que invocan los puntos de entrada reales con la composición de TASK-013 (sin dobles de caso de uso) sobre las utilidades del arnés:
  1. **Comando directo (AC-002, RF-001, RF-002)**: `handleCommand('create-new-playlist', …)` con `--name`, `--description` y `--private` devuelve `0`, presenta el literal aprobado con identificador y enlace, la creación llega al `POST https://api.spotify.com/v1/users/{usuario}/playlists` simulado, todas las llamadas observadas son de `api.spotify.com/v1/` y el tramo nuevo del registro temporal contiene los eventos `info` de inicio y de éxito con nombre, visibilidad `privada`, descripción efectiva e identificador.
  2. **Menú interactivo (AC-003, UC-001)**: `runInteractiveMode()` con la opción `4` recorre selector, nombre, descripción, visibilidad preseleccionada y `(s/N): ` en ese orden, crea por la red simulada, presenta el literal de éxito con descripción por defecto, vuelve al menú y sale con `0` y código `0`, registrando inicio y éxito en el fichero temporal.
  3. **`Ctrl+C` en la petición de nombre (AC-003, N-002)**: 1 interrupción simulada, **cero** llamadas de red, sin literal de éxito, vuelta al menú y **cero** eventos de creación en el tramo nuevo del registro.
  4. **`Ctrl+C` en la confirmación (AC-003, N-002)**: 1 interrupción simulada tras consultar sesión y listado (llamadas de red > 0), **ninguna** llamada `POST`, sin literal de éxito, vuelta al menú y **cero** eventos de creación.
  5. **Sin Internet (RNF-004)**: el doble de `fetch` rechaza con `URL no simulada en la prueba` cualquier URL fuera de las reglas y la registra, de modo que ninguna petición puede salir a la red real.
  6. **Aislamiento (RNF-001)**: `SPOTY_TOKENS_FILE` y `SPOTY_LOG_FILE` apuntan al directorio temporal (bajo `tmpdir()`), los tokens del arnés contienen el testigo ficticio, ni la salida ni el registro contienen el testigo ni `Bearer`, y `data/app.log` y `data/tokens.json` reales no contienen los marcadores de la prueba (`Viaje Arnes TC023` y el testigo).
- `tests/helpers/arnes-e2e.ts` — utilidades compartidas del arnés: `aislarFicherosEnTemporal` (crea el temporal y fija `SPOTY_LOG_DIR`, `SPOTY_LOG_FILE` y `SPOTY_TOKENS_FILE`), `escribirTokensFicticios` (testigo inventado con `REQUIRED_SCOPES`), `contenidoDe`, `respuestaJson`, `ReglaSimulacion`/`LlamadaSimulada`/`SpotifySimulado`, `simularSpotify` (doble de `fetch` que rechaza toda URL no simulada), `reglasCreacionExitosa` (perfil, listado de propias y creación), `capturarSalidaConsola` (espía de `process.stdout.write`), `marcarRegistro`/`esperarEventosNuevos`/`leerTramoNuevo` (vaciado de Pino y lectura del tramo nuevo) y `estadoReadline`/`moduloReadlineSimulado` (entrada simulada con `Ctrl+C`).
- `tsconfig.type-tests.json`: ampliado el `include` con `tests/helpers/**/*.ts` e `tests/integration/**/*.ts` para que `tsc` verifique los ficheros nuevos (precedente de TASK-001 y TASK-002).

### Evidencia RED

`npx vitest run tests/integration/arnes-e2e.test.ts` → **exit 1**

- `Test Files 1 failed (1)`, `Tests no tests`, `Type Errors no errors`.
- `Error: Cannot find module '/tests/helpers/arnes-e2e.js' imported from C:/Proyectos/spoty2/tests/integration/arnes-e2e.test.ts` (`ERR_MODULE_NOT_FOUND`), elevado desde el `vi.mock` de `node:readline/promises`.
- Fallo por ausencia del comportamiento esperado (el arnés no existe), no por error de configuración accidental: `vitest.config.ts`, `tsconfig.json` y `tsconfig.type-tests.json` intactos en el RED.
- Línea base previa verificada antes de empezar: `npx vitest run` → exit 0 con 26 ficheros y 264 pruebas.

### Implementación (GREEN)

- `tests/helpers/arnes-e2e.ts` (nuevo): utilidades descritas arriba; sin dependencias nuevas, sin `any`, con funciones por debajo de complejidad cognitiva 15 y documentación en español estricto; módulo exclusivo de pruebas, fuera del empaquetado del binario (RNF-004, compatibilidad SEA).
- `tests/integration/arnes-e2e.test.ts` (nuevo): las 6 pruebas de TC-023; el `vi.mock` de `node:readline/promises` es asíncrono e importa la utilidad compartida de forma dinámica, porque los factories de `vi.mock` se elevan por encima de los imports estáticos y así ambos accesos comparten la misma instancia de módulo.
- **Ningún fichero de producción se modifica**: todo lo que exige TC-023 ya existe (punto de inyección de `fetch` de TASK-002/TASK-013, `SPOTY_TOKENS_FILE` en `tokens-file.ts`, `SPOTY_LOG_FILE` en `log-file.ts`, entrada `LectorEntrada` con `Ctrl+C` de TASK-012 y captura de salida sobre `process.stdout.write`).

#### Decisión de diseño documentada (no es `DISC-XXX`)

El comportamiento está especificado (TASK-017, TEST_PLAN TC-023, RNF-001 y RNF-004); solo se decidió cómo se codifica:

- **Doble de `fetch` global en lugar de `msw`**: opción expresamente prevista en TASK-017 y en TEST_PLAN §2; el gateway y el SDK ya usan `fetch` global, de modo que el simulador cubre el flujo completo sin dependencias nuevas.
- **Aislamiento por tramo del registro** (`marcarRegistro` + `esperarEventosNuevos` + `leerTramoNuevo`) en lugar de truncar el fichero entre pruebas: el singleton de Pino mantiene abierto el transporte durante todo el proceso, así que cada prueba lee solo lo escrito después de su marca; la ausencia de eventos se comprueba con vaciado, ventana de reposo y lectura del tramo.
- **Contador `abortos` en `estadoReadline`**: hace observable que el camino de `Ctrl+C` (escuchador `SIGINT` disparado) se usó realmente, no que una respuesta distinta de `s` hubiese cancelado igualmente.
- **Ventana de reposo de 250 ms** en `leerTramoNuevo` para las comprobaciones de ausencia, complementando al `flush` del transporte (riesgo «Pino asíncrono en pruebas» previsto en TEST_PLAN §11).

### Evidencia GREEN

`npx vitest run tests/integration/arnes-e2e.test.ts` → **exit 0**

- `Test Files 1 passed (1)`, `Tests 6 passed (6)`, `Type Errors no errors`.

### Refactorización

- Extracción de `comprobarAborto(tramo)` en la prueba: las 4 aserciones comunes de los dos abortos con `Ctrl+C` dejan de duplicarse.
- Eliminación de `SalidaCapturada.limpiar()`, API muerta que ninguna prueba usaba.
- `npx biome check --write` sobre los ficheros nuevos: orden de importaciones corregido (`vitest` antes del relativo); ninguna otra corrección pendiente.
- Verificación tras el refactor: TC-023 en verde con las mismas 6 pruebas y la suite completa en verde.

### Comprobación de no vaciedad (mutaciones temporales, revertidas)

SHA-256 de los ficheros de producción antes y después de las mutaciones: `src/business/playlists/crear-playlist.ts` → `83421F94FB272A346E4F2F972FD7999DA33E53F6CA655270E5AE6D287295D5AB` y `src/data/storage/tokens-file.ts` → `832C28C028736273C4A2DFFEFBA6FE08288F4C86E16536993F412A9A5BB42491` (idénticos antes y después, sin rastro de mutación); 0 menciones de `MUTACIÓN` en el arnés.

| Mutación temporal | Comando | Resultado |
| --- | --- | --- |
| `crear-playlist.ts` sin el `info` de éxito | `npx vitest run tests/integration/arnes-e2e.test.ts` | exit 1 — 3 fallos: comando, menú y aislamiento, con `Tiempo agotado esperando … Playlist creada con éxito` (16.5 s) |
| `tokens-file.ts` ignora `SPOTY_TOKENS_FILE` | `npx vitest run tests/integration/arnes-e2e.test.ts` | exit 1 — 4 fallos: comando (`expected 1 to be 0`), menú (sin literal de éxito), `Ctrl+C` en confirmación (`Ctrl+C sin escuchador`, la sesión nunca llega a la confirmación) y aislamiento |
| Arnés: el doble devuelve `'ctrl+c'` como respuesta normal sin disparar `SIGINT` | `npx vitest run tests/integration/arnes-e2e.test.ts` | exit 1 — 2 fallos: las dos pruebas de `Ctrl+C` (el contador `abortos` queda en 0; en la de nombre además el flujo reentra hasta agotar respuestas) |
| Revertir las tres mutaciones y volver a TC-023 y a la suite | `npx vitest run tests/integration/arnes-e2e.test.ts` y `npx vitest run` | exit 0 — 6/6 y 270/270 en verde, con SHA-256 idénticos a los previos |

### Validaciones ejecutadas

| Validación | Comando | Resultado |
| --- | --- | --- |
| RED de la tarea | `npx vitest run tests/integration/arnes-e2e.test.ts` | exit 1 — `Tests no tests` y `ERR_MODULE_NOT_FOUND` en `tests/helpers/arnes-e2e.js` (arnés inexistente), 0 errores de tipo |
| TC-023 (GREEN, tras REFACTOR y al cierre) | `npx vitest run tests/integration/arnes-e2e.test.ts` | exit 0 — 1 fichero, 6 pruebas, 0 errores de tipo |
| No vacuidad: mutaciones (registro de éxito, fichero de tokens, `Ctrl+C` del arnés) | `npx vitest run tests/integration/arnes-e2e.test.ts` | exit 1 — 3, 4 y 2 fallos respectivamente; revertidas → exit 0 con SHA-256 idénticos |
| Suite completa | `npx vitest run` | exit 0 — 27 ficheros, 270 pruebas, 0 errores de tipo (antes 26/264; +1 fichero y +6 pruebas de TC-023) |
| Compilación estricta | `npx tsc --noEmit` | exit 0 |
| Tipos de pruebas (con los ficheros nuevos incluidos) | `npx tsc -p tsconfig.type-tests.json --noEmit` | exit 0 |
| Estática y formato de los ficheros tocados | `npx biome check tests/helpers/arnes-e2e.ts tests/integration/arnes-e2e.test.ts tsconfig.type-tests.json` | exit 0 — 3 ficheros, sin errores |
| Complejidad cognitiva < 15 y ausencia de `any` | Reglas `complexity/noExcessiveCognitiveComplexity` y `suspicious/noExplicitAny` de Biome sin incidentes en los 3 ficheros | Cumple |
| Sin Internet ni credenciales reales | TC-023 pruebas 5 y 6: doble que rechaza toda URL no simulada; testigo ficticio ausente de salida y registro; sin `Bearer` ni `authorization` en el registro temporal | Cumple |
| Sin escritura en el repositorio por TC-023 | TC-023 prueba 6: `data/app.log` y `data/tokens.json` reales sin los marcadores de la prueba | Cumple |
| Sin cambios de producción ni de artefactos aprobados | SHA-256 de `crear-playlist.ts` y `tokens-file.ts` idénticos tras las mutaciones; `git status --short` sin cambios nuevos en `src/` ni en `specs/` | Cumple |
| Pruebas de otras tareas intactas | `npx vitest run` | 270 pruebas en verde; los `M`/`??` de `git status` corresponden a la línea base de la rama (los únicos cambios de TASK-017 son `tests/helpers/arnes-e2e.ts`, `tests/integration/arnes-e2e.test.ts` y el `include` de `tsconfig.type-tests.json`) |

#### Observación

**No se abre ningún `DISC-XXX`**: no falta nada para completar TASK-017 —el arnés permite ejecutar el comando y el menú de extremo a extremo con la composición real, con Spotify simulado por el doble de `fetch` que rechaza toda URL no simulada, con ficheros de tokens y de registro en directorio temporal mediante `SPOTY_TOKENS_FILE` y `SPOTY_LOG_FILE`, con la salida de consola capturada y con la entrada interactiva simulada incluida la interrupción `Ctrl+C`; TC-023 está en verde con 6 pruebas, ninguna prueba necesita Internet ni credenciales reales ni escribe en `data/`, la suite completa pasa de 26/264 a 27/270 en verde, y `tsc --noEmit`, los tipos de pruebas y Biome sobre los 3 ficheros tocados terminan en `0`.

Se mantiene la observación de línea base de las tareas anteriores (`npx biome check .` a nivel de repositorio reporta solo ficheros no tocados por esta feature y `npx vitest run --coverage` sigue sin `@vitest/coverage-v8`, pendiente de decisión del orquestador en TASK-020/TC-028). **Observación nueva, preexistente y ajena a TASK-017**: durante la suite completa, `data/app.log` del repositorio es escrito únicamente por la prueba de regresión preexistente `tests/business/retry/retry.test.ts` (TC-005, ruta por defecto del reporter de Pino de TASK-004), verificado ejecutando ese fichero de forma aislada y comprobando el cambio de su fecha de modificación; TC-023 no escribe en `data/` (su propia prueba de aislamiento lo verifica con marcadores). Corresponde al orquestador decidir si lo registra como `DISC-XXX` en el ámbito de TASK-020/TC-028; esta tarea no modifica esa prueba de línea base.

## TASK-018 — Aceptación — comando directo: creación y errores de servicio

- **Fecha**: 2026-10-09
- **Trazabilidad**: `OBJ-001 → RF-001, RF-002, RNF-001, RNF-002, RNF-006 → UC-001 (principal, E1, E2, E3) → AC-001, AC-002, AC-004 → TASK-018 → TC-024, TC-025`
- **Estado**: completada (TC-024 y TC-025 en verde; suite completa, `tsc --noEmit`, tipos de pruebas y Biome sin errores en los ficheros de la tarea)
- **Alcance respetado**: un fichero de prueba nuevo (`tests/acceptance/comando-directo.test.ts`) más el `include` de `tsconfig.type-tests.json` ampliado con `tests/acceptance/**/*.ts`; **cero ficheros de producción modificados** (las 3 mutaciones de no vaciedad quedaron revertidas con SHA-256 idénticos), sin dependencias nuevas, sin artefactos aprobados tocados (`ACCEPTANCE_CRITERIA.feature` 0.2.0 y el resto de `specs/003-creacion-de-playlist-vacia/` intactos; `git status --porcelain -- specs/` sin entradas `M`), sin commits y en la misma rama `feat/REQ-003-creacion-de-playlist-vacia` con `HEAD 482bd57e138cab7924f74111efa2c6cd7307d67b`

### TEST creado

- `tests/acceptance/comando-directo.test.ts` — **TC-024** y **TC-025**, 3 escenarios ejecutables en español estricto (`Característica`, `Escenario`, `Dado`, `Cuando`, `Entonces`, `Y`, `Pero`) con etiquetas `@AC-001`, `@AC-002` y `@AC-004`, donde cada paso del `.feature` aparece como comentario con sus aserciones correspondientes (correspondencia 1:1 entre paso y aserción) y los literales se fijan a mano desde la especificación aprobada, sin leerlos de `MESSAGES`:
  1. **TC-024 / AC-001 (RF-001, RF-002, UC-001)**: sesión válida en el temporal, `handleCommand('create-new-playlist', [--name, --description, --private])` devuelve `0`, un único `POST https://api.spotify.com/v1/users/{usuario}/playlists` simulado, literal de éxito exacto con identificador y enlace, eventos `info` de inicio y éxito en el registro temporal con nombre, visibilidad `privada`, descripción efectiva e identificador, y ni salida ni registro contienen el testigo ni `Bearer`/`access_token`/`refresh_token` (RNF-001).
  2. **TC-024 / AC-002 (RF-001, RF-002, UC-001)**: los 4 ejemplos aprobados de P-001 (`--private`; `--private --description "Carretera"`; `--public --description "Carretera"`; `--public` con descripción por defecto) devuelven `0`, envían el cuerpo `{name, description, public}` esperado en cada caso sin pedir nada en terminal, y las 2 rechazadas (nombre de 101 caracteres y visibilidad ausente o doble) terminan en `1` sin crear, mostrando los literales exactos de longitud y de flag único; la longitud inválida continúa en el flujo y se cancela con `Ctrl+C` simulado tras repetir la petición literal de nombre (UC-001-E3).
  3. **TC-025 / AC-004 (RF-002, RNF-001, RNF-006, UC-001)**: sin sesión → `1` con `No hay sesión activa…` y cero llamadas de red; 401 → `Sesión caducada…`; 403 → `Permisos insuficientes…`; 429 persistente con `Retry-After: 1` → 4 `POST` (1 + 3 reintentos) con espera de 1000 ms en cada reintento, 3 advertencias con `intento` 1-3 y `estado` 429, literal `Vuelva a intentarlo más tarde` (la rama de 10 segundos sin cabecera queda cubierta sin temporizadores reales en TC-006/TC-014); fallo genérico 500 → literal de fallo inesperado y registro con `causa: HTTP 500` sin el cuerpo sensible; y comprobaciones de no exposición (testigo, `Bearer`, cuerpos de respuesta) en registro y salida (timeout de 20000 ms por las esperas reales de `Retry-After`).
- Arnés: se reutiliza `tests/helpers/arnes-e2e.ts` de TASK-017 (`aislarFicherosEnTemporal` con `SPOTY_TOKENS_FILE`/`SPOTY_LOG_FILE`, `simularSpotify` con `reglasCreacionExitosa`, `escribirTokensFicticios`, `capturarSalidaConsola`, `marcarRegistro`/`esperarEventosNuevos`/`leerTramoNuevo`, `estadoReadline`); sin Internet, sin credenciales reales y sin escritura en `data/` (RNF-004).
- `tsconfig.type-tests.json`: ampliado el `include` con `tests/acceptance/**/*.ts` para que `tsc` verifique el fichero nuevo (precedente de TASK-017).

### Evidencia RED

`npx vitest run tests/acceptance/comando-directo.test.ts` → **exit 1**

- Primera ejecución: `Test Files 1 failed (1)`, `Tests 3 failed (3)`, `Type Errors no errors`, con:
  - `AssertionError: expected '' to contain 'testigo-tc-018-ficticio'` en el paso `Dado` de AC-001 (línea 163) y de AC-004 (línea 313);
  - `AssertionError: expected 1 to be +0` en la primera invocación de AC-002 (línea 219).
- Diagnóstico: fallo por **bug de configuración de la prueba**, no por comportamiento ausente: al fichero le faltaban los ganchos `beforeEach`/`afterEach`/`afterAll` (no se escribían los tokens ficticios, no se capturaba la salida, no se instalaba la red ni se marcaba el registro). Se corrigió **solo la prueba** (los criterios y el `.feature` no se tocan) añadiendo los ganchos según el patrón de TC-023.
- Segunda ejecución, ya con la preparación correcta: **exit 0** con `Tests 3 passed (3)`. Los escenarios no pueden caer en rojo por comportamiento porque TASK-001–TASK-016 ya implementaron el flujo completo; se deja constancia honesta y la evidencia de no vaciedad (RED observable) se obtiene con las **mutaciones temporales revertidas** de la sección siguiente.
- Línea base verificada antes de empezar: `npx vitest run` → exit 0 con 27 ficheros y 270 pruebas.

### Implementación (GREEN)

- **Ningún fichero de producción se modifica**: todo lo exigido por TC-024 y TC-025 ya existe (punto de entrada `handleCommand` de TASK-010, comando directo de TASK-015, coordinador de TASK-014, política de reintento ADR-001/TASK-009, literales de TASK-011 y arnés de TASK-017).
- Correcciones exclusivamente del propio fichero de prueba: ganchos de preparación/limpieza (`escribirTokensFicticios`, `estadoReadline.reiniciar()`, `capturarSalidaConsola`, `simularSpotify` con reglas exitosas, `marcarRegistro`; y `closeReadline`/`restaurar`/borrado del temporal).
- Helpers de aserción sin duplicación: `invocarComando`, `reglasExitosas`, `reglasConCreacionFallida`, `respuestaLimite`, `ejecutarConCreacionFallida`, `comprobarSinDatosSensibles`.

### Evidencia GREEN

`npx vitest run tests/acceptance/comando-directo.test.ts` → **exit 0**

- `Test Files 1 passed (1)`, `Tests 3 passed (3)`, `Type Errors no errors` (tras la corrección de preparación y de nuevo tras el refactor).

### Refactorización

- Extracción de `creaciones()` en la prueba: `urlsDeCreacion`, `numeroDeCreaciones` y `ultimoCuerpoDeCreacion` dejan de repetir el filtro `metodo === 'POST'`.
- `npx biome check --write tests/acceptance/comando-directo.test.ts`: formato corregido, ninguna otra corrección pendiente.
- Verificación tras el refactor: el fichero en verde con las mismas 3 pruebas y la suite completa en verde.

### Comprobación de no vaciedad (mutaciones temporales, revertidas)

SHA-256 de los ficheros de producción antes y después de las mutaciones (idénticos, sin rastro de mutación; los cuatro ficheros son `??` en la línea base, por lo que la reversión se hizo por edición inversa y se verificó por hash):

| Fichero | SHA-256 antes y después |
| --- | --- |
| `src/business/playlists/crear-playlist.ts` | `83421F94FB272A346E4F2F972FD7999DA33E53F6CA655270E5AE6D287295D5AB` |
| `src/business/playlists/politica-reintento.ts` | `649EA8C89634559FD18AD88414DAFA74FFB8396FE5E106FA8CDA7D6C523BCC83` |
| `src/business/playlists/validacion.ts` | `E2F5DBA98DEADECAA5CE0FC10B4E50FDC7CA6483B1530BF6AFC241CDFD096320` |
| `src/presentation/comando-crear-playlist.ts` (sin mutar) | `7C7EA1AC2277EAB988DF2172B2FF0EBCB926F082EBF93AF490303B0F1EBEEDEC` |

| Mutación temporal | Comando | Resultado |
| --- | --- | --- |
| `crear-playlist.ts`: `MENSAJE_EXITO` de `'Playlist creada con éxito'` a `'Playlist creada con exito (mutacion)'` | `npx vitest run tests/acceptance/comando-directo.test.ts` | exit 1 — `Tests 1 failed \| 2 passed (3)`: cae **@AC-001** (el registro ya no lleva el mensaje exacto de éxito); revertida → exit 0 |
| `politica-reintento.ts`: `MAX_REINTENTOS` de 3 a 2 | `npx vitest run tests/acceptance/comando-directo.test.ts` | exit 1 — `Tests 1 failed \| 2 passed (3)`: cae **@AC-004** con `expected 3 to be 4` (3 `POST` en lugar de 4); revertida → exit 0 |
| `validacion.ts`: `DESCRIPCION_POR_DEFECTO` de `'Playlist sin descripción'` a `'Descripción por defecto (mutacion)'` | `npx vitest run tests/acceptance/comando-directo.test.ts` | exit 1 — `Tests 1 failed \| 2 passed (3)`: cae **@AC-002** con `expected { name: 'Viaje 2026', … } to deeply equal … - "description": "Playlist sin descripción"`; revertida → exit 0 |
| Revertir las tres mutaciones y verificar hashes | `Get-FileHash -Algorithm SHA256` sobre los 4 ficheros y `npx vitest run tests/acceptance/comando-directo.test.ts` | Los 4 SHA-256 idénticos a los previos y exit 0 con 3/3 en verde |

### Validaciones ejecutadas

| Validación | Comando | Resultado |
| --- | --- | --- |
| RED de la tarea (preparación de la prueba ausente) | `npx vitest run tests/acceptance/comando-directo.test.ts` | exit 1 — `Tests 3 failed (3)`, 0 errores de tipo: 2 fallos de `Dado` sin testigo y 1 de `expected 1 to be +0`, corregidos solo en la prueba |
| GREEN (tras corregir la prueba) | `npx vitest run tests/acceptance/comando-directo.test.ts` | exit 0 — 1 fichero, 3 pruebas, 0 errores de tipo |
| No vacuidad: 3 mutaciones (mensaje de éxito, `MAX_REINTENTOS`, descripción por defecto) | `npx vitest run tests/acceptance/comando-directo.test.ts` | exit 1 en cada mutación, matando exactamente @AC-001, @AC-004 y @AC-002 respectivamente; revertidas → exit 0 con SHA-256 idénticos |
| TC-024 (filtro) | `npx vitest run -t 'TC-024'` | exit 0 — 11 pruebas coinciden con el filtro (2 escenarios de TC-024 verificados con `--reporter=verbose` + 9 pruebas de tipo `*.test-d.ts` que `-t` no filtra), 262 omitidas |
| TC-025 (filtro) | `npx vitest run -t 'TC-025'` | exit 0 — 10 pruebas coinciden con el filtro (1 escenario de TC-025 + 9 de tipo), 263 omitidas |
| Fichero completo tras REFACTOR | `npx vitest run tests/acceptance/comando-directo.test.ts` | exit 0 — 3/3, 0 errores de tipo |
| Suite completa | `npx vitest run` | exit 0 — 28 ficheros, 273 pruebas, 0 errores de tipo (antes 27/270; +1 fichero y +3 pruebas de TC-024/TC-025) |
| Compilación estricta | `npx tsc --noEmit` | exit 0 |
| Tipos de pruebas (con `tests/acceptance/**/*.ts` incluido) | `npx tsc -p tsconfig.type-tests.json --noEmit` | exit 0 |
| Estática y formato de los ficheros tocados | `npx biome check tests/acceptance/comando-directo.test.ts tsconfig.type-tests.json` | exit 0 — 2 ficheros, sin errores |
| Complejidad cognitiva < 15 y ausencia de `any` | Reglas `complexity/noExcessiveCognitiveComplexity` y `suspicious/noExplicitAny` de Biome sin incidentes en los ficheros de la tarea | Cumple |
| Gherkin en español estricto y correspondencia paso:aserción 1:1 | Los 3 escenarios usan `Característica`/`Escenario`/`Dado`/`Cuando`/`Entonces`/`Y`/`Pero`; cada paso del `.feature` copiado como comentario posee aserciones inmediatamente posteriores | Cumple |
| Sin Internet ni credenciales reales; sin escritura en `data/` | Arnés de TASK-017: doble de `fetch` que rechaza toda URL no simulada, testigo ficticio en ficheros temporales vía `SPOTY_TOKENS_FILE`/`SPOTY_LOG_FILE`, sin `Bearer` ni tokens en salida ni registro | Cumple |
| Sin cambios de producción ni de artefactos aprobados | SHA-256 de los 4 ficheros idénticos tras las mutaciones; `git status --porcelain -- specs/` sin entradas `M`; `ACCEPTANCE_CRITERIA.feature` sin tocar; rama y `HEAD` sin cambios | Cumple |

#### Observación

**No se abre ningún `DISC-XXX`**: no falta nada para completar TASK-018 — TC-024 y TC-025 están en verde con los 3 escenarios de aceptación sobre el comando directo (4 ejemplos válidos, 2 rechazos y los 5 desenlaces de error de AC-004 sin exposición de datos sensibles), la suite completa pasa de 27/270 a 28/273 en verde, y `tsc --noEmit`, los tipos de pruebas y Biome sobre los 2 ficheros tocados terminan en `0`.

Se mantiene la observación de línea base de las tareas anteriores (`npx biome check .` a nivel de repositorio reporta solo ficheros no tocados por esta feature y `npx vitest run --coverage` sigue sin `@vitest/coverage-v8`, pendiente de decisión del orquestador en TASK-020/TC-028), así como la observación preexistente y ajena a esta tarea de que `data/app.log` del repositorio es escrito únicamente por la prueba de regresión `tests/business/retry/retry.test.ts` (TC-005); TASK-018 no escribe en `data/`.



## TASK-019 — Aceptación — menú interactivo, validación y duplicados

- **Fecha**: 2026-10-09
- **Trazabilidad**: `OBJ-001 → RF-001, RF-002, RNF-002, RNF-006 → UC-001, UC-001-A1 → AC-003, AC-005 → TASK-019 → TC-026, TC-027`
- **Estado**: completada (TC-026 y TC-027 en verde; suite completa, `tsc --noEmit`, tipos de pruebas y Biome sin errores en el fichero de la tarea)
- **Alcance respetado**: un fichero de prueba nuevo (`tests/acceptance/menu-interactivo.test.ts`); **cero ficheros de producción modificados** (las 4 mutaciones quedaron revertidas con SHA-256 idénticos), sin dependencias nuevas, sin tocar `tsconfig.type-tests.json` (ya incluía `tests/acceptance/**/*.ts` desde TASK-018), sin artefactos aprobados tocados (`ACCEPTANCE_CRITERIA.feature` 0.2.0 y el resto de `specs/003-creacion-de-playlist-vacia/` intactos; `git status --porcelain -- specs/` sin entradas `M`), sin commits y en la misma rama `feat/REQ-003-creacion-de-playlist-vacia` con `HEAD 482bd57e138cab7924f74111efa2c6cd7307d67b`

### TEST creado

- `tests/acceptance/menu-interactivo.test.ts` — **TC-026** y **TC-027**, 2 escenarios ejecutables en español estricto (`Característica`, `Escenario`, `Dado`, `Cuando`, `Entonces`, `Y`, `Pero`) con etiquetas `@AC-003` y `@AC-005` conservadas de `ACCEPTANCE_CRITERIA.feature` 0.2.0, donde cada paso del `.feature` aparece como comentario con sus aserciones correspondientes (correspondencia 1:1 entre paso y aserción) y los literales se fijan a mano desde la especificación aprobada, sin leerlos de `MESSAGES`:
  1. **TC-026 / AC-003 (RF-001, RF-002, RNF-002, UC-001)**: sesión del menú con Spotify simulado —opción `4. Crear playlist vacía` visible, ayuda `(navega con 0-4,9, Ctrl+C para cancelar)` (y ausencia de la ayuda anterior `0-3,9`), peticiones en orden `Nombre de la playlist (3-100 caracteres):`, `Descripción (opcional, Enter para usar "Playlist sin descripción"):` y lista de visibilidad con `Pública (preseleccionada)`—, confirmación `(s/N): ` donde solo `s` minúscula crea (una única creación con `POST` simulado) mientras `N` y `S` mayúscula vuelven al menú sin crear, y `Ctrl+C` simulado en la petición de nombre y en la confirmación aborta sin crear y sin registrar (`info` de inicio y de éxito ausentes en el tramo nuevo del registro temporal).
  2. **TC-027 / AC-005 (RF-001, RF-002, RNF-006, UC-001, UC-001-A1, UC-001-E3)**: nombre vacío, solo espacios y de 101 caracteres rechazados en menú con su literal exacto y reingreso (4 peticiones de nombre), más el rechazo en comando directo que muestra el literal y continúa con la petición de nombre antes del aborto; nombre duplicado tras recortar espacios (`Viaje 2026 ` con propias simuladas) muestra `Ya existe una playlist llamada "Viaje 2026".`, el menú `¿Qué deseas hacer? 1. Modificar nombre 2. Crear de todos modos con el mismo nombre 0. Cancelar sin crear / Elige (0-2):` y registra `advertencia` técnica con el nombre (RNF-006); opción `1` repite el nombre y pregunta `¿Deseas modificar descripción y visibilidad? (s/N): `; el mismo nombre en minúsculas no es duplicado (comparación exacta sensible a mayúsculas); opción `2` continúa hacia la confirmación final y crea una única playlist con `POST` al usuario simulado más `info` de inicio y éxito; opción `0` muestra `Creación cancelada. No se creó ninguna playlist.`, vuelve al selector sin invocar la confirmación, no crea nada y no añade `info` de inicio ni de éxito al registro.
- Arnés: se reutiliza `tests/helpers/arnes-e2e.ts` de TASK-017 (`aislarFicherosEnTemporal` con `SPOTY_TOKENS_FILE`/`SPOTY_LOG_FILE`, `simularSpotify` con `reglasCreacionExitosa` y `propias` con el nombre duplicado, `escribirTokensFicticios`, `capturarSalidaConsola`, `marcarRegistro`/`esperarEventosNuevos`/`leerTramoNuevo`, `estadoReadline`); sin Internet, sin credenciales reales y sin escritura en `data/` (RNF-001, RNF-004).

### Evidencia RED

`npx vitest run tests/acceptance/menu-interactivo.test.ts` — **exit 1**

- Primera ejecución: `Test Files 1 failed (1)`, `Tests 1 failed | 1 passed (2)`, `Type Errors no errors`, con:
  - `AssertionError: expected '{"level":30,...}' not to contain 'Inicio de creación de playlist vacía'` en la comprobación negativa de `Ctrl+C` de AC-003 (línea 253).
- Diagnóstico: fallo de **orden del arnés**, no de comportamiento ausente: el transporte asíncrono de Pino puede escribir el `info` de la creación de la primera sesión después de tomarse la marca intermedia, y el tramo posterior la incluía. Se corrigió **solo la prueba** (criterios y `.feature` intactos) esperando con `esperarEventosNuevos` el inicio y el éxito de la creación antes de marcar el registro para la sección de abortos, patrón ya usado en TC-023/TC-024.
- Segunda ejecución, ya con el orden correcto: **exit 0** con `Tests 2 passed (2)`. Los escenarios no pueden caer en rojo por comportamiento porque TASK-001 a TASK-018 ya implementan el flujo completo; se deja constancia honesta y la evidencia de no vaciedad (RED observable) se obtiene con las **mutaciones temporales revertidas** de la sección siguiente.
- Línea base verificada antes de empezar: `npx vitest run` — exit 0 con 28 ficheros y 273 pruebas.

### Implementación (GREEN)

- **Ningún fichero de producción se modifica**: todo lo exigido por TC-026 y TC-027 ya existe (menú de TASK-016, coordinador de TASK-014, peticiones de TASK-012, literales de TASK-011, validación y duplicados de TASK-005/TASK-006, caso de uso de TASK-008 y arnés de TASK-017).
- Correcciones exclusivamente del propio fichero de prueba: espera del vaciado del transporte antes de la marca de los abortos (RED) y supresión de la constante no usada `CONFIRMACION_SALIDA` (Biome).

### Evidencia GREEN

`npx vitest run tests/acceptance/menu-interactivo.test.ts` — **exit 0**

- `Test Files 1 passed (1)`, `Tests 2 passed (2)`, `Type Errors no errors` (tras corregir la prueba y de nuevo tras el refactor).

### Refactorización

- Extracción de `tomarMarcas`/`observacionesDesde`: `ejecutarMenu` y `ejecutarComandoDirecto` dejan de repetir la captura de marcas y el cálculo de tramos observados (salida, peticiones, creaciones y abortos por sesión).
- `npx biome check --write tests/acceptance/menu-interactivo.test.ts`: formato corregido y constante no usada eliminada, ninguna otra corrección pendiente.
- Verificación tras el refactor: el fichero en verde con las mismas 2 pruebas y la suite completa en verde.

### Comprobación de no vaciedad (mutaciones temporales, revertidas)

SHA-256 de los ficheros de producción antes y después de las mutaciones (idénticos, sin rastro de mutación; la reversión se hizo por edición inversa y se verificó por hash):

| Fichero | SHA-256 antes y después |
| --- | --- |
| `src/presentation/prompts.ts` | `0EDE6189F892034C29155F9278FEAAF6B6C41E28CD801C890918CDA234FAB6AB` |
| `src/presentation/messages.ts` | `74CEC8C695568C6E07AD705DA8DF11E1C3DD1384D0E5ED3994B48F6D707192A0` |
| `src/business/playlists/validacion.ts` | `E2F5DBA98DEADECAA5CE0FC10B4E50FDC7CA6483B1530BF6AFC241CDFD096320` |
| `src/business/playlists/crear-playlist.ts` (sin mutar) | `83421F94FB272A346E4F2F972FD7999DA33E53F6CA655270E5AE6D287295D5AB` |
| `src/presentation/crear-playlist.ts` | `45DAB182721E573138B47950769EFCEFB54A81D8619C43DAC7606176ACD7AA31` |

| Mutación temporal | Comando | Resultado |
| --- | --- | --- |
| `prompts.ts`: `interpretarConfirmacionS` acepta `S` mayúscula (`trim().toLowerCase() === 's'`) | `npx vitest run tests/acceptance/menu-interactivo.test.ts` | exit 1 — `Tests 1 failed \| 1 passed (2)`: cae **@AC-003** (`expected ... not to contain 'Playlist creada:'` con `S`); revertida |
| `messages.ts`: literal del menú de duplicados `Elige (0-2):` a `Elige (0-3):` | `npx vitest run tests/acceptance/menu-interactivo.test.ts` | exit 1 — `Tests 1 failed \| 1 passed (2)`: cae **@AC-005** (aserción de peticiones con el menú exacto); revertida |
| `crear-playlist.ts` (coordinador): la opción `0` del duplicado deja de mostrar `Creación cancelada. No se creó ninguna playlist.` | `npx vitest run tests/acceptance/menu-interactivo.test.ts` | exit 1 — `Tests 1 failed \| 1 passed (2)`: cae **@AC-005** (`expected '' to contain 'Creación cancelada...'`); revertida |
| `validacion.ts`: `esDuplicadoPropio` insensible a mayúsculas | `npx vitest run tests/acceptance/menu-interactivo.test.ts` | exit 1 — `Tests 1 failed \| 1 passed (2)`: cae **@AC-005** (el nombre en minúsculas pasa a ser duplicado y el flujo pide el menú sin respuestas programadas); revertida |
| Revertir las cuatro mutaciones y verificar hashes | `Get-FileHash -Algorithm SHA256` sobre los 5 ficheros y `npx vitest run tests/acceptance/menu-interactivo.test.ts` | Los 5 SHA-256 idénticos a los previos y exit 0 con 2/2 en verde |

### Validaciones ejecutadas

| Validación | Comando | Resultado |
| --- | --- | --- |
| RED de la tarea (preparación de la prueba) | `npx vitest run tests/acceptance/menu-interactivo.test.ts` | exit 1 — `Tests 1 failed \| 1 passed (2)`, 0 errores de tipo: fallo de orden del transporte de Pino en la comprobación negativa de `Ctrl+C`, corregido solo en la prueba |
| GREEN (tras corregir la prueba) | `npx vitest run tests/acceptance/menu-interactivo.test.ts` | exit 0 — 1 fichero, 2 pruebas, 0 errores de tipo |
| No vaciedad: 4 mutaciones (confirmación `S`, literal del menú de duplicados, rama `0` sin cancelación literal, duplicado insensible a mayúsculas) | `npx vitest run tests/acceptance/menu-interactivo.test.ts` | exit 1 en cada mutación, matando exactamente @AC-003, @AC-005, @AC-005 y @AC-005; revertidas → exit 0 con SHA-256 idénticos |
| TC-026 (filtro) | `npx vitest run -t 'TC-026'` | exit 0 — 10 pruebas coinciden con el filtro (1 escenario de TC-026 + 9 pruebas de tipo `*.test-d.ts` que `-t` no filtra), 265 omitidas |
| TC-027 (filtro) | `npx vitest run -t 'TC-027'` | exit 0 — 10 pruebas coinciden con el filtro (1 escenario de TC-027 + 9 de tipo), 265 omitidas |
| Fichero completo tras REFACTOR | `npx vitest run tests/acceptance/menu-interactivo.test.ts` | exit 0 — 2/2, 0 errores de tipo |
| Suite completa | `npx vitest run` | exit 0 — 29 ficheros, 275 pruebas, 0 errores de tipo (antes 28/273; +1 fichero y +2 pruebas de TC-026/TC-027) |
| Compilación estricta | `npx tsc --noEmit` | exit 0 |
| Tipos de pruebas (con `tests/acceptance/**/*.ts` incluido) | `npx tsc -p tsconfig.type-tests.json --noEmit` | exit 0 |
| Estática y formato del fichero tocado | `npx biome check tests/acceptance/menu-interactivo.test.ts` | exit 0 — 1 fichero, sin errores |
| Complejidad cognitiva < 15 y ausencia de `any` | Reglas `complexity/noExcessiveCognitiveComplexity` y `suspicious/noExplicitAny` de Biome sin incidentes; los helpers `ejecutarMenu`/`ejecutarComandoDirecto` quedan en complejidad mínima tras la refactorización | Cumple |
| Gherkin en español estricto y correspondencia paso:aserción 1:1 | Los 2 escenarios usan `Característica`/`Escenario`/`Dado`/`Cuando`/`Entonces`/`Y`/`Pero`; cada paso del `.feature` copiado como comentario posee aserciones inmediatamente posteriores; sin renumerar identificadores (nota O-004 respetada: ningún escenario dividido ni identificador tocado) | Cumple |
| Sin Internet ni credenciales reales; sin escritura en `data/` | Arnés de TASK-017: doble de `fetch` que rechaza toda URL no simulada, testigo ficticio en ficheros temporales vía `SPOTY_TOKENS_FILE`/`SPOTY_LOG_FILE`; `git status --porcelain -- data/` sin entradas | Cumple |
| Sin cambios de producción ni de artefactos aprobados | SHA-256 de los 5 ficheros idénticos tras las mutaciones; `git status --porcelain -- specs/` sin entradas `M`; `ACCEPTANCE_CRITERIA.feature` sin tocar; rama `feat/REQ-003-creacion-de-playlist-vacia` y `HEAD 482bd57` sin cambios, sin commits | Cumple |

#### Observación

**No se abre ningún `DISC-XXX`**: no falta nada para completar TASK-019 — TC-026 y TC-027 están en verde con los 2 escenarios de aceptación sobre el menú interactivo (ayuda, peticiones, visibilidad preseleccionada, confirmación `s` única, abortos `Ctrl+C` sin crear ni registrar) y sobre validación y duplicados (rechazo con literal y reingreso, duplicado con su menú, ramas `1`, `2` y `0` con sus literales y comportamiento, y sin creación en la rama `0`), la suite completa pasa de 28/273 a 29/275 en verde, y `tsc --noEmit`, los tipos de pruebas y Biome sobre el fichero de la tarea terminan en `0`.

Se mantiene la observación de línea base de las tareas anteriores (`npx biome check .` a nivel de repositorio reporta solo ficheros no tocados por esta feature y `npx vitest run --coverage` sigue sin `@vitest/coverage-v8`, pendiente de decisión del orquestador en TASK-020/TC-028), así como la observación preexistente y ajena a esta tarea de que `data/app.log` del repositorio es escrito únicamente por la prueba de regresión `tests/business/retry/retry.test.ts` (TC-005); TASK-019 no escribe en `data/`.

---

## TASK-020 — Transversal — verificación de los requisitos no funcionales RNF-001 a RNF-006 (TC-028)

- **Fecha**: 2026-10-09
- **Trazabilidad**: `OBJ-001 → RNF-001, RNF-002, RNF-003, RNF-004, RNF-005, RNF-006 → UC-001 → AC-001, AC-002, AC-003, AC-004, AC-005 → TASK-020 → TC-028`
- **Estado**: completada en verde (TC-028 con 20 pruebas y suite completa en verde; `tsc --noEmit`, tipos de pruebas y Biome sobre el alcance tocado terminan en 0), con **`DISC-003` abierto** para la validación externa de cobertura de RNF-005: el resultado final de esta tarea es `DISCOVERY_REQUIRES_ANALYSIS`.
- **Alcance respetado**: 2 ficheros de prueba nuevos (`tests/transversal/verificacion-rnf.test.ts`, `tests/helpers/verificacion-rnf.ts`); ajustes de configuración en `biome.json` (regla de complejidad cognitiva con `maxAllowedComplexity: 14`) y `tsconfig.type-tests.json` (inclusión de `tests/transversal/**/*.ts`); 2 ficheros de producción solo normalizados de fin de línea sin cambio de contenido (`git diff` vacío); **cero dependencias nuevas** (no se instala `@vitest/coverage-v8`, ver observación); sin artefactos aprobados tocados (`git status --porcelain -- specs/` sin entradas `M`), sin commits, en la misma rama `feat/REQ-003-creacion-de-playlist-vacia` con `HEAD 482bd57e138cab7924f74111efa2c6cd7307d67b`.

### TEST creado

- `tests/transversal/verificacion-rnf.test.ts` — **TC-028**, 20 pruebas en español estricto agrupadas por requisito sobre el estado real del repositorio:
  1. **RNF-001 (2 pruebas)**: ausencia de patrones de testigo en la consola, en el registro temporal equivalente a `data/app.log`, en `data/app.log`, en los ficheros generados de `downloads/` y en toda la fuente de `src/`; y ninguna causa de error con cuerpos de respuesta, cabeceras ni testigos (`clasificarErrorData`).
  2. **RNF-002 (1 prueba)**: los 18 literales aprobados, carácter a carácter, en `ACCEPTANCE_CRITERIA.feature` y en `src/presentation/` (la revisión lingüística completa queda documentada aquí como manual).
  3. **RNF-003 (5 pruebas)**: revisión de imports por capas (`revisarBusiness`, `revisarModulosCreacion`, `revisarDatos`, `revisarPresentacion`) e invocación real de `crearPlaylistVacia` sin `argv`, `readline` ni salida a consola.
  4. **RNF-004 (1 prueba)**: dependencias congeladas carácter a carácter (3 y 7 claves), `bin` y `engines.node`, ausencia de `binding.gyp` y de carga nativa en `src/`.
  5. **RNF-005 (5 pruebas)**: `tsc --noEmit` sobre `tsconfig.json` y `tsconfig.type-tests.json` por spawn, `biome check` sobre código, pruebas y configuración por spawn, configuración de cobertura del 80 % en `vitest.config.ts`, y `biome.json`/`tsconfig.json` con complejidad menor de 15, sin `any` y modo estricto.
  6. **RNF-006 (6 pruebas)**: eventos `info` de inicio y éxito, `warn` de duplicado sin `info`, reintentos `level 40` con `estado 429` e `intento` 1-3 más `error` final con `causa: 'HTTP 429'`, `error` con `causa: 'HTTP 500'` sin cuerpo sensible ni testigos, cancelaciones sin ninguna entrada de registro ni `POST`, y `REQUIRED_SCOPES` con ambos ámbitos de playlist.
- `tests/helpers/verificacion-rnf.ts` (nuevo): `PATRONES_TESTIGO`/`buscarTestigos`, `listarFicheros`, `fuentesDe`, `leerFichero`, los cuatro revisores de capas, `ejecutarTypeScript` y `ejecutarBiome` (spawn de los binarios reales con `execFileSync(process.execPath, ...)`).
- Arnés: se reutiliza `tests/helpers/arnes-e2e.ts` de TASK-017 (`aislarFicherosEnTemporal`, `simularSpotify`, `escribirTokensFicticios`, `capturarSalidaConsola`, `marcarRegistro`/`esperarEventosNuevos`/`leerTramoNuevo`); sin Internet, sin credenciales reales y sin escritura en `data/` del repositorio (RNF-001, RNF-004).
- Configuración de soporte: `tsconfig.type-tests.json` añade `tests/transversal/**/*.ts` para que los spawns de `tsc` cubran la propia prueba; `biome.json` fija `noExcessiveCognitiveComplexity` a `{ level: 'error', options: { maxAllowedComplexity: 14 } }` porque el requisito es «menor de 15» y el valor por defecto de Biome es 15 (se comprobó antes que ningún código existente lo incumple).

### Evidencia RED

`npx vitest run tests/transversal` — **exit 1**

- `Test Files 1 failed (1)`, con `Error: Cannot find module '../helpers/verificacion-rnf.js' imported from C:/Proyectos/spoty2/tests/transversal/verificacion-rnf.test.ts`.
- Fallo por ausencia del comportamiento esperado (el módulo de comprobaciones todavía no existe), no por error de configuración accidental.

### Implementación (GREEN)

- `tests/helpers/verificacion-rnf.ts` (nuevo): patrones de testigo, lectura de ficheros, revisores de imports por capas y ejecutadores de `tsc`/`biome`.
- Primera ejecución ya con el helper: `npx vitest run tests/transversal` — **exit 1** con `Tests 17 passed | 3 failed (20)`, con hallazgos reales que se corrigieron:
  1. error de tipo por importar `SolicitudCreacion` de `puertos.js` (corregido al importarlo de `types.js`) y `causaDe` con un tipo de parámetro débil (reforzado con la unión exacta);
  2. los dos spawns de `biome` sobre `src`/`tests` fallaban con exit 1 porque `src/business/download-songs.ts` y `src/business/types/download-songs.types.ts` tenían fin de línea CRLF (normalizados con `biome check --write`, `git diff` vacío: solo fin de línea);
  3. `biome.json` usaba la forma abreviada `"error"` en `noExcessiveCognitiveComplexity`, mientras la prueba exige el objeto `{ level, options }` con `maxAllowedComplexity: 14`.
- Al activar la regla de complejidad con umbral 14, el propio helper `revisar()` quedó en 15: se dividió en `infraccionesDeImports`, `infraccionesDeContenido` y `revisar` (refactorización realizada ya dentro de la fase GREEN, sin cambiar aserciones).

### Evidencia GREEN

`npx vitest run tests/transversal` — **exit 0**

- `Test Files 1 passed (1)`, `Tests 20 passed (20)`, `Type Errors no errors`.
- Los spawns internos de `tsc` y `biome` de la propia prueba terminan en 0 dentro de este resultado.

### Refactorización

- Centralización de la limpieza en el `afterEach` del bloque `describe` (restauración de la salida capturada, de la red simulada, `vi.unstubAllGlobals()` y `vi.restoreAllMocks()`) mediante los helpers `instalarSalida()` e `instalarRed()`: se eliminaron los 7 bloques `try/finally { salida.restaurar(); red.restaurar(); }` duplicados, con lo que la restauración también se ejecuta cuando una prueba falla. Ninguna aserción cambió.
- `npx biome check tests/transversal/verificacion-rnf.test.ts` — exit 0 (sin correcciones pendientes).
- Verificación tras el refactor: `npx vitest run tests/transversal` — exit 0 con las mismas 20 pruebas.

### Comprobación de no vaciedad (mutaciones temporales, revertidas)

| Mutación temporal | Comando | Resultado |
| --- | --- | --- |
| `tests/transversal/verificacion-rnf.test.ts`: `MENSAJE_EXITO` de `Playlist creada con éxito` a `Playlist creada con exito` (sin tilde) | `npx vitest run tests/transversal` | exit 1 — `Tests 2 failed \| 18 passed (20)`: caen RNF-001 y RNF-006 con `Error: Tiempo agotado esperando Playlist creada con exito`; revertida → exit 0 con 20/20 |
| `src/business/auth/types.ts`: se elimina `'playlist-modify-private'` de `REQUIRED_SCOPES` | `npx vitest run tests/transversal` | exit 1 — `Tests 1 failed \| 19 passed (20)`: cae exactamente RNF-006 (`AssertionError: expected [ 'user-read-private', …(6) ] to deeply equal [ 'user-read-private', …(7) ]`); revertida → exit 0 con 20/20 |
| Verificación de la reversión por hash | `Get-FileHash -Algorithm SHA256 src/business/auth/types.ts` y `git status --porcelain -- src/business/auth/types.ts` | SHA-256 idéntico antes y después: `774D7A47F569FC18A425B56EF57B3C44E812A58390F5B78AD6390DC53D610671`; `git status` vacío (sin cambios residuales) |

### Validaciones ejecutadas

| Validación | Comando | Resultado |
| --- | --- | --- |
| RED de la tarea | `npx vitest run tests/transversal` | exit 1 — `Cannot find module '../helpers/verificacion-rnf.js'` (módulo inexistente) |
| GREEN, primera pasada | `npx vitest run tests/transversal` | exit 1 — 17 pasan / 3 fallan: tipo de `SolicitudCreacion`, `causaDe` débil, CRLF en 2 ficheros y forma de `biome.json`; corregidos |
| GREEN confirmado y REFACTOR | `npx vitest run tests/transversal` | exit 0 — 20 pruebas, 0 errores de tipo (también tras el refactor) |
| No vaciedad: 2 mutaciones revertidas | `npx vitest run tests/transversal` | exit 1 en cada mutación (2 fallas y 1 falla respectivamente) y exit 0 tras revertir, con SHA-256 idéntico en `src/business/auth/types.ts` |
| TC-028 (fichero completo tras todo) | `npx vitest run tests/transversal` | exit 0 — 20/20, `Type Errors no errors` |
| Suite completa | `npx vitest run` | exit 0 — 30 ficheros, 295 pruebas, 0 errores de tipo (antes 29/275; +1 fichero y +20 pruebas de TC-028) |
| Compilación estricta | `npx tsc --noEmit` | exit 0 |
| Tipos de pruebas (con `tests/transversal/**/*.ts` incluido) | `npx tsc -p tsconfig.type-tests.json --noEmit` | exit 0 |
| Estática y formato del alcance tocado | `npx biome check src tests biome.json tsconfig.json tsconfig.type-tests.json vitest.config.ts` | exit 0 — 67 ficheros, sin errores |
| Baseline global honesto (no es alcance de esta tarea) | `npx biome check . --reporter=summary` | exit 1 — 38 errores en 100 ficheros, todos preexistentes y fuera de `src/` y `tests/`: `dist/**/*.d.ts` (28), `.opencode/model-policy.json`, `downloads/2026-10-07_01-00-07-download_songs.json`, `opencode.json`, `package.json` y `skills-lock.json`; reglas `lint/style/useImportType` (4) y `lint/complexity/noUselessEmptyExport` (2) más formato |
| Cobertura del 80 % (validación externa de RNF-005) | `npx vitest run --coverage` | **exit 1** — `MISSING DEPENDENCY  Cannot find dependency '@vitest/coverage-v8'` → `DISC-003` y resultado `DISCOVERY_REQUIRES_ANALYSIS` (no se instala: RNF-004 y `TEST_PLAN.md` §8 exigen «sin dependencias nuevas») |
| Complejidad cognitiva < 15 y ausencia de `any` | Reglas `complexity/noExcessiveCognitiveComplexity` (umbral 14) y `suspicious/noExplicitAny` de Biome sobre `src` y `tests` | Sin incidentes; `revisar()` del helper partido al exceder 15 |
| Sin artefactos aprobados tocados, sin dependencias, sin commits | `git status --porcelain -- specs/` sin entradas `M`; `package.json` sin cambios; `git rev-parse HEAD` = `482bd57e138cab7924f74111efa2c6cd7307d67b` | Cumple |

#### Observación

**Se abre `DISC-003` y TASK-020 devuelve `DISCOVERY_REQUIRES_ANALYSIS`**: TC-028 está en verde con sus 20 pruebas y la suite completa en verde (30/295), pero la validación externa de cobertura de RNF-005 (`npx vitest run --coverage`, umbral 80 % en `src/business/**`) no es ejecutable porque `@vitest/coverage-v8` no está declarado y TASK-020/`TEST_PLAN.md` §8 exigen literalmente «sin dependencias nuevas», mientras TC-028 congela los `devDependencies` exactos. Instalar el proveedor o replanificar el alcance requiere el análisis de `change-analyzer` y aprobación correspondiente; no se adopta ninguna solución especulativa.

Se mantienen, además, las observaciones ya conocidas: (a) el baseline global de `npx biome check .` falla por 38 errores en ficheros no tocados por esta feature (`dist/`, `downloads/`, `opencode.json`, `package.json`, `skills-lock.json`, `.opencode/model-policy.json`); (b) la causa raíz de los CRLF de `download-songs.ts` y `download-songs.types.ts` es `core.autocrlf=true` sin `.gitattributes` —`git diff` vacío y `git status` los lista como `M` solo por fin de línea—, se normalizan sin contenido y no se crea `.gitattributes` por estar fuera del alcance; (c) `src/business/retry/retry.ts` importa `data/logging/pino-setup` (preexistente en `HEAD 482bd57`; la regla global de Business solo prohíbe Presentation, CLI y el paquete Pino, y la revisión estricta de TC-028 se aplicó sobre `src/business/playlists/**`) — observación, no incidencia; (d) `data/app.log` del repositorio sigue escribiéndose únicamente con TC-005 (`tests/business/retry/retry.test.ts`), y TC-028 usa directorio temporal.

### Addendum de cierre — replan 0.1.2 de DISC-003 (2026-10-10)

- **Fecha**: 2026-10-10
- **Trazabilidad**: `OBJ-001 → RNF-001, RNF-002, RNF-003, RNF-004, RNF-005, RNF-006 → UC-001 → AC-001, AC-002, AC-003, AC-004, AC-005 → TASK-020 → TC-028`
- **Estado**: **TASK-020 NO se cierra**: el replan 0.1.2 de `DISC-003` queda aplicado y operativo (dependencia instalada, cobertura ejecutable, TC-028 en verde), pero la validación externa de cobertura de RNF-005 falla con evidencia numérica y abre `DISC-004`; el resultado de esta tarea vuelve a ser `DISCOVERY_REQUIRES_ANALYSIS`.
- **Alcance respetado**: única dependencia nueva `@vitest/coverage-v8` (autorizada por replan 0.1.2); aserción congelada de TC-028 actualizada de 7 a 8 `devDependencies` sin relajar ninguna otra aserción; cero cambios en `src/` (producción); sin artefactos aprobados tocados (`SPECS/REQUIREMENTS/USE_CASES/ACCEPTANCE/ARCHITECTURE/ADR/TASKS/TEST_PLAN` sin modificar en este asiento), sin commits, en la misma rama `feat/REQ-003-creacion-de-playlist-vacia` con `HEAD 482bd57`.

#### Instalación versionada (única dependencia nueva autorizada)

- `npm install --save-dev @vitest/coverage-v8@5.0.3` → **exit 0**; versión instalada y fijada en el lockfile: **5.0.3 exacta**, declarada en `devDependencies` como `^5.0.3` (consistente con la convención del resto de `devDependencies` y con `vitest ^5.0.3`); 12 paquetes añadidos.
- `npm ls @vitest/coverage-v8` → **exit 0**, `@vitest/coverage-v8@5.0.3` resuelto y `deduped` bajo `vitest@5.0.3`, **sin warnings de peer**. Coherente con la investigación de la sesión `ses_eda7558d7ffeDSwxty722FlS0b` (veredicto SÍ, versión 5.0.3, licencia MIT, solo `devDependencies`, sin binarios nativos, sin efecto sobre el empaquetado SEA, compatible con vitest 5.0.3 y Node 24 — ejecutado en Node v24.20.0).
- `coverage/` queda ignorado por la línea preexistente `.gitignore:28` (`coverage`), verificada con `git check-ignore -v coverage` y `git check-ignore -v coverage/index.html`: **no se añade ninguna entrada nueva a `.gitignore`**.
- Trazabilidad intacta: `DISC-003` sigue clasificado `PLANNING_OMISSION` (replan 0.1.2 ya asentado en `TASKS.md` y `TEST_PLAN.md`); se registra `DISC-004` por el resultado de la cobertura (más abajo).

#### Ciclo TDD del replan (aserción congelada de 7 a 8 paquetes)

| Fase | Cambio | Comando | Resultado |
| --- | --- | --- | --- |
| RED | `tests/transversal/verificacion-rnf.test.ts`: la aserción congelada de `devDependencies` de RNF-004 pasa de 7 a 8 claves con `'@vitest/coverage-v8'` en orden alfabético, exactamente como fija `TEST_PLAN.md` 0.1.2 (sin relajar ninguna otra aserción) | `npx vitest run tests/transversal` | **exit 1** — `Tests 1 failed \| 19 passed (20)`: falla exactamente la aserción de RNF-004 (`expected [ '@biomejs/biome', …(6) ] to deeply equal [ '@biomejs/biome', …(7) ]`) por ausencia del proveedor en `package.json`; fallo válido por ausencia del comportamiento esperado, no por configuración |
| GREEN | `npm install --save-dev @vitest/coverage-v8@5.0.3` (único código necesario: el paquete en `devDependencies`) | `npx vitest run tests/transversal` | **exit 0** — `Test Files 1 passed (1)`, `Tests 20 passed (20)`, `Type Errors no errors` |
| REFACTOR | Sin cambios de comportamiento: no se toca ninguna aserción adicional ni ninguna fuente; la única modificación de la prueba es la lista congelada autorizada | `npx biome check tests/transversal/verificacion-rnf.test.ts` | **exit 0** — sin correcciones pendientes |

#### Validación externa de cobertura (RNF-005) — resultado desfavorable

`npx vitest run --coverage` → **exit 1**; suite en verde (30 ficheros, 295 pruebas, 0 errores de tipo) pero la cobertura de `src/business/**` **no alcanza el umbral del 80 % en ninguna de las cuatro métricas**:

| Métrica (`src/business/**`) | Obtenida | Umbral | Detalle |
| --- | --- | --- | --- |
| Sentencias | **71,86 %** | 80 % | 281/391 |
| Ramas | **72,64 %** | 80 % | 162/223 |
| Funciones | **79,51 %** | 80 % | 66/83 |
| Líneas | **71,72 %** | 80 % | 279/389 |

Por fichero (las cifras decisivas): `business/download-songs.ts` **0 %** (líneas 45-150 sin cubrir), `business/auth/flow.ts` **8,97 %**, `business/auth/tokens.ts` 93,1 %, `business/auth/types.ts` 92,3 %, `business/playlists/**` 97,76 % (`crear-playlist.ts` 100 %, `errores.ts` 94,82 %), `business/retry/retry.ts` 97,87 %.

**Causa raíz** (sin atajos adoptados): la instrumentación v8 es correcta —los módulos de la feature 003 superan holgadamente el umbral—, pero ninguna prueba del repositorio ejecuta `src/business/download-songs.ts` (código preexistente de la feature 002) ni `src/business/auth/flow.ts` (código preexistente de la feature 001): la única suite que los toca, `tests/presentation/menu-crear-playlist.test.ts`, los sustituye íntegramente con `vi.mock`. Alcanzar el 80 % exigiría pruebas nuevas sobre el flujo OAuth y la descarga, comportamiento de otras features fuera del alcance de TASK-020. Conforme a la instrucción de no inventar atajos, **no se relaja el umbral**, **no se excluye ningún fichero del `include`**, **no se añaden pruebas de otras features** y **no se toca producción**: se registra `DISC-004` y se devuelve `DISCOVERY_REQUIRES_ANALYSIS`.

#### Resto de validaciones (todas en verde)

| Validación | Comando | Resultado |
| --- | --- | --- |
| TC-028 (tras GREEN) | `npx vitest run tests/transversal` | exit 0 — 20/20, `Type Errors no errors` |
| Suite completa | `npx vitest run` | exit 0 — 30 ficheros, 295 pruebas, 0 errores de tipo |
| Compilación estricta | `npx tsc --noEmit` | exit 0 |
| Tipos de pruebas | `npx tsc -p tsconfig.type-tests.json --noEmit` | exit 0 |
| Estática y formato del alcance tocado | `npx biome check src tests biome.json tsconfig.json tsconfig.type-tests.json vitest.config.ts` | exit 0 — 67 ficheros, sin errores |
| Cobertura (RNF-005) | `npx vitest run --coverage` | **exit 1** — 71,86/72,64/79,51/71,72 % frente al umbral del 80 % → `DISC-004` |
| Sin artefactos aprobados tocados, sin commits | `git status --porcelain -- specs/` sin entradas `M` nuevas en artefactos aprobados; `git rev-parse --short HEAD` = `482bd57` | Cumple (los únicos cambios en ficheros seguidos de este asiento son `package.json` y `package-lock.json`) |

#### Conclusión del addendum

`DISC-003` queda **cerrado operativamente**: la causa que lo motivó (cobertura no ejecutable por dependencia ausente) está resuelta con la instalación versionada y la evidencia de ejecución. Sin embargo, la ejecución destapa un hecho nuevo y separado —el umbral del 80 % es inalcanzable con las pruebas actuales por los módulos preexistentes sin cobertura—, registrado como **`DISC-004`** en `DISCOVERIES.md`. En consecuencia, **TASK-020 permanece abierta** y su resultado sigue siendo **`DISCOVERY_REQUIRES_ANALYSIS`**: el cierre requiere el análisis de `change-analyzer` sobre `DISC-004` (pruebas de `flow.ts` y `download-songs.ts` como planificación, o revisión del umbral de RNF-005 con `CR-XXX` y aprobación humana). La trazabilidad crítica `OBJ → RNF → UC → AC → TASK-020 → TC-028 → CODE → VALIDATION` permanece intacta y documentada.

---

## Addendum de cierre de TASK-020 — ejecución de `CR-001` (re-acotación de la cobertura al alcance 003)

- **Fecha**: 2026-10-10
- **TASK**: TASK-020 — Verificación transversal de los requisitos no funcionales RNF-001 a RNF-006 (TC-028)
- **Trazabilidad**: `OBJ-001 → RNF-001, RNF-002, RNF-003, RNF-004, RNF-005, RNF-006 → UC-001 → AC-001, AC-002, AC-003, AC-004, AC-005 → TASK-020 → TC-028`
- **Cambio ejecutado**: `CR-001` (`SCOPE_CHANGE`, aprobación humana explícita el 2026-10-10 08:51, replanificación 0.1.3 ya aplicada en `TASKS.md` y `TEST_PLAN.md`)
- **Motivo**: la validación externa de cobertura de RNF-005 daba 71,9 % global sobre `src/business/**` por módulos preexistentes de las features 001 y 002; `CR-001` aprueba medir solo el alcance 003 (`src/business/playlists/**` + `src/business/retry/**`) **conservando el umbral del 80 %** en las cuatro métricas
- **Artefactos tocados en esta ejecución**: `vitest.config.ts` (`coverage.include`), `tests/transversal/verificacion-rnf.test.ts` (aserción congelada de TC-028), este registro y los estados de `CR-001`/`DISC-004`. Sin cambios en `src/`, en SPECS/REQUIREMENTS/USE_CASES/ACCEPTANCE/ARCHITECTURE/ADR ni en los umbrales

### TDD

| Fase | Cambio | Comando | Resultado |
| --- | --- | --- | --- |
| RED | `tests/transversal/verificacion-rnf.test.ts` (TC-028): la aserción congelada de `coverage.include` pasa del agregado `['src/business/**/*.ts']` a los dos patrones del alcance 003 `['src/business/playlists/**/*.ts', 'src/business/retry/**/*.ts']` con aserción negativa sobre el agregado; se conserva `provider: 'v8'` y los cuatro umbrales en 80 | `npx vitest run tests/transversal/verificacion-rnf.test.ts -t "vitest.config.ts exige cobertura mínima del 80 % en el alcance 003"` | **exit 1** — `Tests 1 failed \| 19 skipped (20)`: falla exactamente la aserción del `include` (`expected … to contain 'include: ['src/business/playlists/**…'`) porque `vitest.config.ts` aún aplicaba el agregado; fallo válido por ausencia del comportamiento esperado, no por configuración |
| GREEN | `vitest.config.ts`: `coverage.include` pasa a `['src/business/playlists/**/*.ts', 'src/business/retry/**/*.ts']` (mínimo cambio); `provider: 'v8'`, `reporter` y los umbrales `lines/functions/branches/statements: 80` intactos | `npx vitest run tests/transversal/verificacion-rnf.test.ts -t "vitest.config.ts exige cobertura mínima del 80 % en el alcance 003"` | **exit 0** — `Tests 1 passed \| 19 skipped`, `Type Errors no errors` |
| REFACTOR | Sin cambios de comportamiento: la única modificación admissible fue poner el array del `include` en una línea conforme al `lineWidth` de Biome; ninguna aserción ni fuente se altera | `npx biome check vitest.config.ts tests/transversal/verificacion-rnf.test.ts` | **exit 0** — `Checked 2 files`, sin correcciones pendientes |

### Comprobación de no vaciedad por mutación temporal (revertida)

| Paso | Acción | Comando | Resultado |
| --- | --- | --- | --- |
| 1 | Se guarda copia y hash de `vitest.config.ts` | `Get-FileHash vitest.config.ts` | `A1EC56E985C04B61488E9DBD746824C04FE3AC83A0D746B758188847214F587A` |
| 2 | Mutación temporal del `include` de vuelta al agregado `['src/business/**/*.ts']` | `npx vitest run tests/transversal/verificacion-rnf.test.ts -t "…alcance 003"` | **exit 1** — la aserción congelada de TC-028 vuelve a fallar: la prueba detecta la regresión del re-acotamiento |
| 3 | Reversión desde la copia | `Copy-Item` + `Get-FileHash` | Hash idéntico al original (`HASH_IDENTICO=SI`) |
| 4 | Reejecución tras la reversión | `npx vitest run tests/transversal/verificacion-rnf.test.ts -t "…alcance 003"` | **exit 0** — verde restaurado con fichero byte a byte idéntico |

### Validación externa de cobertura (RNF-005, alcance 003 re-acotado por `CR-001`)

`npx vitest run --coverage` → **exit 0**; suite en verde (30 ficheros, 295 pruebas, 0 errores de tipo) y cobertura **= 80 % en las cuatro métricas** del alcance 003, con el umbral intacto:

| Métrica (alcance 003) | Obtenida | Umbral | Detalle |
| --- | --- | --- | --- |
| Sentencias | **97,79 %** | 80 % | 177/181 |
| Ramas | **92,50 %** | 80 % | 111/120 |
| Funciones | **100 %** | 80 % | 45/45 |
| Líneas | **97,76 %** | 80 % | 175/179 |

Por fichero: `business/playlists/crear-playlist.ts` 100 % (ramas 94,44 %, línea 148 sin cubrir), `business/playlists/errores.ts` 94,82 % (líneas 111, 125, 137), `business/retry/retry.ts` 97,87 % (línea 167, ramas 83,33 %).

### Resto de validaciones (todas en verde)

| Validación | Comando | Resultado |
| --- | --- | --- |
| TC-028 completo (estado final) | `npx vitest run tests/transversal/verificacion-rnf.test.ts` | exit 0 — 20/20, `Type Errors no errors` |
| Suite completa | `npx vitest run` | exit 0 — 30 ficheros, 295 pruebas, 0 errores de tipo |
| Compilación estricta | `npx tsc --noEmit` | exit 0 |
| Tipos de pruebas | `npx tsc -p tsconfig.type-tests.json --noEmit` | exit 0 |
| Estática y formato del alcance tocado | `npx biome check vitest.config.ts tests/transversal/verificacion-rnf.test.ts` | exit 0 — 2 ficheros, sin errores |
| Sin commits y sin salir de rama | `git status --short` y `git rev-parse --short HEAD` | Rama `feat/REQ-003-creacion-de-playlist-vacia`, HEAD `482bd57`, sin commit |

### Conclusión del addendum

`CR-001` queda **ejecutado**: `vitest.config.ts` mide la cobertura solo sobre el alcance 003 con el umbral del 80 % intacto, la aserción congelada de TC-028 congela ese alcance, la validación externa de RNF-005 pasa con holgura (97,79/92,50/100/97,76 %) y la comprobación de no vaciedad por mutación revertida confirma que la prueba protege el cambio. Con ello, los seis RNF de TASK-020 quedan verificados y **TASK-020 puede cerrarse**. `CR-001` pasa a `IMPLEMENTADO` y `DISC-004` queda cerrado; la trazabilidad crítica `OBJ → RNF → UC → AC → TASK-020 → TC-028 → CODE → VALIDATION` permanece intacta. Este asiento no cierra la feature: el gate `FEATURE_DONE` sigue siendo responsabilidad de `final-validator`.

---

## TASK-021 — Documentación — evidencia TDD y cierre de trazabilidad de la planificación

- **Fecha**: 2026-10-10
- **Trazabilidad**: `OBJ-001 → RNF-002, RNF-005 → UC-001 → AC-001, AC-002, AC-003, AC-004, AC-005 → TASK-021 → TC-029`
- **Tipo**: documental. Conforme a `TASKS.md` § TASK-021 y `TEST_PLAN.md` § TC-029, se sustituye el ciclo `RED → GREEN → REFACTOR` por una **validación verificable equivalente**: revisión de contenido del registro y de la coherencia de las matrices de planificación.
- **Estado**: completada (TC-029 en verde mediante validación equivalente; sin tareas de comportamiento sin evidencia; documentación en español estricto).
- **Alcance respetado**: solo `TDD_LOG.md` (raíz), `specs/003-creacion-de-playlist-vacia/TASKS.md` y `specs/003-creacion-de-playlist-vacia/TEST_PLAN.md`. Cero cambios en `src/`, en `tests/`, en requisitos, casos de uso, criterios de aceptación, arquitectura, ADR ni en `ACCEPTANCE_CRITERIA.feature`; sin dependencias nuevas, sin commits y en la misma rama `feat/REQ-003-creacion-de-playlist-vacia` con `HEAD 482bd57`.

### Validación equivalente de TC-029 — comprobaciones de contenido

Criterio aplicado: cada `TASK-001` a `TASK-020` de comportamiento tiene al menos una entrada en `TDD_LOG.md` con fecha, prueba afectada y resultado del ciclo, y al menos un `TC-XXX` en `TEST_PLAN.md`.

| TASK | Entrada en `TDD_LOG.md` | Fecha | Ciclo documentado | Prueba(s) en `TEST_PLAN.md` |
| --- | --- | --- | --- | --- |
| TASK-001 | § TASK-001 | 2026-10-08 | RED → GREEN → REFACTOR | TC-001 |
| TASK-002 | § TASK-002 | 2026-10-08 | RED → GREEN → REFACTOR | TC-002, TC-003 |
| TASK-003 | § TASK-003 | 2026-10-08 | RED → GREEN → REFACTOR | TC-004 |
| TASK-004 | § TASK-004 | 2026-10-08 | RED → GREEN → REFACTOR | TC-005, TC-006 |
| TASK-005 | § TASK-005 | 2026-10-08 | RED → GREEN → REFACTOR | TC-007 |
| TASK-006 | § TASK-006 | 2026-10-08 | RED → GREEN → REFACTOR | TC-008 |
| TASK-007 | § TASK-007 | 2026-10-08 | RED → GREEN → REFACTOR | TC-009 |
| TASK-008 | § TASK-008 (bloqueo documentado por `DISC-002`, sin RED por no existir decisión aprobada) más § TASK-008 (reintento tras replan 0.1.1) | 2026-10-08 y 2026-10-09 | RED → GREEN → REFACTOR completo en el reintento | TC-010, TC-011, TC-012, TC-013 |
| TASK-009 | § TASK-009 | 2026-10-09 | RED → GREEN → REFACTOR | TC-014, TC-015 |
| TASK-010 | § TASK-010 | 2026-10-09 | RED → GREEN → REFACTOR | TC-016 |
| TASK-011 | § TASK-011 | 2026-10-09 | RED → GREEN → REFACTOR | TC-017 |
| TASK-012 | § TASK-012 | 2026-10-09 | RED → GREEN → REFACTOR | TC-018 |
| TASK-013 | § TASK-013 | 2026-10-09 | RED → GREEN → REFACTOR | TC-019 |
| TASK-014 | § TASK-014 | 2026-10-09 | RED → GREEN → REFACTOR | TC-020 |
| TASK-015 | § TASK-015 | 2026-10-09 | RED → GREEN → REFACTOR | TC-021 |
| TASK-016 | § TASK-016 | 2026-10-09 | RED → GREEN → REFACTOR | TC-022 |
| TASK-017 | § TASK-017 | 2026-10-09 | RED → GREEN → REFACTOR | TC-023 |
| TASK-018 | § TASK-018 | 2026-10-09 | RED → GREEN → REFACTOR | TC-024, TC-025 |
| TASK-019 | § TASK-019 | 2026-10-09 | RED → GREEN → REFACTOR | TC-026, TC-027 |
| TASK-020 | § TASK-020 más addenda de replan 0.1.2 (`DISC-003`) y de cierre de `CR-001` | 2026-10-09 y 2026-10-10 | RED → GREEN → REFACTOR en cada asiento | TC-028 |

Resultado de la revisión: **21 entradas de tarea** (TASK-001 a TASK-020, incluido el reintento de TASK-008) con `Fecha`, `TEST creado`, `Evidencia RED`, `Implementación (GREEN)`, `Evidencia GREEN` y `Refactorización` documentados, y **29 casos** (TC-001 a TC-029) con fila propia en `TEST_PLAN.md`. Ninguna tarea de comportamiento queda sin evidencia.

### Comprobaciones de coherencia de las matrices

| Comprobación | Método | Resultado |
| --- | --- | --- |
| Mapeo bidireccional `TASK` ↔ `TC` entre `TASKS.md` (campo «Prueba prevista») y `TEST_PLAN.md` (columna «Tarea») | Análisis programado de los 21 bloques de tarea y de las 29 filas del catálogo | **Sin diferencias**: 21 tareas y 29 casos coinciden en ambos sentidos |
| Fila `RF/RNF` de `TASKS.md` §6 frente al campo «Requisitos» de cada tarea (§5) | Análisis programado de las 8 filas | **0 discrepancias** tras la corrección documental descrita más abajo |
| Fila `RF/RNF` de `TASKS.md` §6 frente a la columna «Requisitos» de cada `TC-XXX` | Análisis programado de las 8 filas | **0 discrepancias** tras la corrección documental |
| Tabla «Cobertura de criterios» de `TASKS.md` §6 | Análisis programado: cada `TASK`/`TC` listado declara efectivamente ese `AC` | **0 entradas inválidas**. Las filas `AC` son de cobertura primaria (tarea de aceptación más soporte), del mismo diseño que `TEST_PLAN.md` §5 («TC-024 (más TC-010, TC-019, TC-020)»), por lo que no se expanden: no hay `AC` huérfano (cada `AC-001` a `AC-005` tiene tarea y prueba) |
| Cadenas de trazabilidad de `TASKS.md` §6 frente a `TRACEABILITY.md` (columna `AC`) | Análisis programado de las 8 filas `RF/RNF` (script en el directorio temporal del entorno) | **5 de 8 idénticas** (`RF-001`, `RF-002`, `RNF-001`, `RNF-002`, `RNF-006` citan exactamente los mismos `AC`). Las 3 restantes (`RNF-003`, `RNF-004`, `RNF-005`) no remiten a ningún `AC` en ninguno de los dos artefactos: `TASKS.md` §6 lo expresa como comprobación en texto («Verificación en arquitectura e implementación» / «… en implementación») y `TRACEABILITY.md` como «- (verificación posterior en …)». Contenido equivalente con redacción distinta; sin `AC` huérfano ni contradictorio. `TRACEABILITY.md` no se modifica (artefacto de especificación) |

### Correcciones documentales aplicadas (mínimas y dentro de los dos artefactos de planificación)

1. **Codificación de `TDD_LOG.md`**: el addendum de cierre de `CR-001` (desde la línea 2128) estaba escrito en CP1252 mientras el resto del fichero es UTF-8, por lo que el fichero era **UTF-8 inválido** (65 bytes no decodificables) y mostraba tildes corruptas (`ejecuci?n`, `verificaci?n`, `m?nima`). Se convirtió la cola a UTF-8 sin pérdida (los bytes altos eran exclusivamente `85`, `97`, `E1`, `E9`, `ED`, `F3`, `FA`, todos representables en CP1252) y se restauraron los **13 separadores `→`** que la codificación previa había sustituido por `?` en las líneas de trazabilidad, en el comando de cobertura y en la conclusión. Verificación: `UTF-8` estricto acepta el fichero completo y no queda ningún `?` en ese addendum.
2. **Matriz `RF/RNF` de `TASKS.md` §6** (columnas `TASK` y `TC` alineadas con las declaraciones de `TASKS.md` §5 y de `TEST_PLAN.md`; la columna `AC` no se toca):
   - `RF-001`: se retiran `TASK-011` y `TC-017` (declaran `RF-002`, no `RF-001`) y se añade `TC-023` (declara `RF-001` y su tarea ya figuraba).
   - `RF-002`: se añaden `TASK-001`, `TASK-004`, `TASK-017` y `TC-001`, `TC-006`, `TC-011`, `TC-023`, `TC-026` (todos declaran `RF-002`).
   - `RNF-001`: se añade `TC-002` (declara `RNF-001`; `TASK-002` ya figuraba).
   - `RNF-002`: se añaden `TASK-020` y `TC-028`, y se retiran `TC-025` y `TC-027` (no declaran `RNF-002`; siguen presentes en las filas `RF-002` y `RNF-006`, que sí declaran).
   - `RNF-006`: se añaden `TC-024`, `TC-025` y `TC-027` (declaran `RNF-006`).
   - La fila `RNF-005` conserva la notación de rango `TASK-001 a TASK-017`, equivalente al conjunto declarado (la única «diferencia» que devuelve el análisis es la notación, no el contenido).
3. **Estados reales en la matriz**: `TASKS.md` §5 pasa las 21 tareas de `PENDING` a `DONE` con el/los `TC` en verde y la referencia a su sección de `TDD_LOG.md`; `TEST_PLAN.md` §4 pasa los 29 casos de `Pendiente` a `Verde`. Se conservan sin tocar las filas de metadato «Estado inicial de todas las tareas» y «Estado inicial de todos los casos», que registran el punto de partida de la planificación.

No se modificó ningún requisito, criterio de aceptación, caso de uso, descripción de prueba, identificador ni trazabilidad `AC`; las correcciones se limitan a columnas derivadas de estado y de agregación.

### Validaciones ejecutadas

| Validación | Comando | Resultado |
| --- | --- | --- |
| TC-029 — revisión de contenido del registro | Lectura de `TDD_LOG.md` y contraste de las 21 entradas de tarea con el catálogo `TC-001` a `TC-029` | exit 0 — 21/21 tareas con fecha, prueba y ciclo; 29/29 casos con fila propia; ninguna tarea de comportamiento sin evidencia |
| TC-029 — coherencia `TASK` ↔ `TC` | Análisis programado de `TASKS.md` y `TEST_PLAN.md` (script en el directorio temporal del entorno) | exit 0 — «SIN DIFERENCIAS: el mapeo TASK <-> TC es bidireccionalmente coherente» (21 tareas, 29 casos) |
| TC-029 — coherencia de la matriz §6 con las declaraciones | Análisis programado fila a fila (8 filas `RF/RNF`, 5 de cobertura `AC`) | exit 0 — discrepancias: 0 en `[1]` requisitos de tarea, 0 en `[2]` requisitos de `TC`, 0 en `[3]` y `[4]` criterios |
| TC-029 — trazabilidad `AC` frente a `TRACEABILITY.md` | Análisis programado de las 8 filas de `TASKS.md` §6 contra la columna `AC` de `TRACEABILITY.md` (script en el directorio temporal del entorno) | exit 0 — 5 filas idénticas (`RF-001`, `RF-002`, `RNF-001`, `RNF-002`, `RNF-006`); `RNF-003`, `RNF-004` y `RNF-005` no citan `AC` en ninguno de los dos documentos (comprobación descrita en texto con redacción distinta); ningún `AC` contradicho |
| TC-029 — español estricto y codificación | Validación UTF-8 estricta de `TDD_LOG.md`, `TASKS.md` y `TEST_PLAN.md`, más búsqueda de frases en inglés | exit 0 — los tres ficheros son UTF-8 válido; las únicas coincidencias en inglés son mensajes literales de `TypeCheckError` entre comillas (identificadores y salidas de herramienta, permitidos) |
| Suite completa | `npx vitest run` | exit 0 — 30 ficheros, 295 pruebas, `Type Errors no errors` |
| Compilación estricta | `npx tsc --noEmit` | exit 0 |
| Estática y formato del código y las pruebas (sin tocarlos) | `npx biome check src tests biome.json tsconfig.json tsconfig.type-tests.json vitest.config.ts` | exit 0 — 67 ficheros, sin errores |
| Estática de los tres documentos tocados | `npx biome check TDD_LOG.md specs/003-creacion-de-playlist-vacia/TASKS.md specs/003-creacion-de-playlist-vacia/TEST_PLAN.md` | exit 1 — «Checked 0 files… No files were processed»: Biome no procesa ficheros Markdown; validación equivalente realizada con la revisión UTF-8 estricta y la revisión de contenido anteriores (ambas en verde) |
| Sin cambios en código ni pruebas, sin commits | `git status --porcelain` y `git rev-parse --short HEAD` | Rama `feat/REQ-003-creacion-de-playlist-vacia`, HEAD `482bd57`, sin commit; ninguna línea nueva de `src/` ni `tests/` respecto de la línea base del inicio de la tarea |

#### Observación

La única salida en rojo de esta tarea es `biome check` sobre ficheros `.md`, que no es una incidencia de calidad: Biome no implementa análisis de Markdown y devuelve «sin ficheros procesados». Para los documentos se emplea la validación verificable equivalente prevista por TC-029 (revisión de contenido, UTF-8 estricto y análisis programado de matrices), documentada en la tabla anterior. No se abre ningún `DISC-XXX`: no falta nada para completar TASK-021.

---

## Corrección TDD — Ciclo A: creación por `POST /v1/me/playlists` (HTTP 403) y Ciclo B: resumen previo y pregunta explícita de la confirmación

- **Fecha**: 2026-10-10
- **Trazabilidad**: `RF-001, RF-002 → RNF-001, RNF-002, RNF-003 → UC-001, UC-001-A1 → AC-001, AC-003 → DISC-005 (Ciclo A) y DISC-006 (Ciclo B) → TC-018, TC-020, TC-021, TC-022, TC-023, TC-026, TC-027`
- **Tipo**: corrección de comportamiento con ciclo `RED → GREEN → REFACTOR` completo en cada ciclo.
- **Decisión de alcance**: el fix del 403 se aprueba sin `CR` en `DISC-005`; la mejora de la TUI se aprueba en dirección en `DISC-006`, con `CR-002` **pendiente de formalizar** (ver «Deuda documental» al final).
- **Alcance respetado**: 4 ficheros de producción y 12 de pruebas; sin dependencias nuevas, sin tocar `specs/` (salvo el `DISCOVERIES.md` previo de DISC-005/DISC-006), sin requisitos, casos de uso ni criterios modificados, sin commits y en la misma rama `feat/REQ-003-creacion-de-playlist-vacia`.

### Ciclo A — la orden de creación usa `POST https://api.spotify.com/v1/me/playlists`

#### TEST creado / modificado

- `tests/data/http/playlists-client.test.ts`: la creación se verifica contra `POST https://api.spotify.com/v1/me/playlists` con cuerpo `{name, description, public}`, sin `collaborative` y **sin** `GET /me` previo; se conservan las comprobaciones de `201` (con `public: true` y `public: false`), `401`, `403`, `429` y `201` con respuesta malformada. No se registran cuerpos ni testigos (RNF-001).
- Arnés y pruebas afectadas por la mismaURL: `tests/helpers/arnes-e2e.ts` (las reglas ganan `metodo?: string`, porque creación y listado comparten `/v1/me/playlists`), `tests/transversal/verificacion-rnf.test.ts`, `tests/acceptance/comando-directo.test.ts`, `tests/acceptance/menu-interactivo.test.ts`, `tests/integration/arnes-e2e.test.ts` y `tests/presentation/composicion-crear-playlist.test.ts`.

#### Evidencia RED

`npx vitest run tests/data/http/playlists-client.test.ts` → **exit 1** con **8 fallos** por comportamiento ausente: `URL no simulada en la prueba: https://api.spotify.com/v1/me` (el cliente todavía hacía `GET /me` para obtener el identificador del usuario antes de crear).

#### Implementación (GREEN)

- `src/data/http/playlists-client.ts`: `crearPlaylist` emite `POST ${URL_BASE}/me/playlists` con `{name, description, public}` —sin `collaborative` y sin `GET /me` previo—; `obtenerUsuario` se conserva exclusivamente para `listarPlaylistsPropias`.
- El resto de ficheros solo ajustan el arnés (`metodo` en las reglas de simulación) y las URLs esperadas.

#### Evidencia GREEN

`npx vitest run tests/data/http/playlists-client.test.ts` → **exit 0** con **13/13** pruebas y `Type Errors no errors`.

#### Refactorización

Sin cambio de comportamiento: la distinción `metodo` de las reglas del arnés elimina la ambigüedad de URL compartida entre `POST` de creación y `GET` de listado, y las pruebas de creación y de listado dejan de depender del orden de llegada.

#### Comprobación de no vaciedad (Ciclo A)

| Paso | Acción | Comando | Resultado |
| --- | --- | --- | --- |
| 1 | Revertir temporalmente el fix (restaurar la llamada previa a `GET /me`) | `npx vitest run tests/data/http/playlists-client.test.ts` | **exit 1** — 8 fallos, el mismo RED inicial |
| 2 | Restaurar el fix | `npx vitest run tests/data/http/playlists-client.test.ts` | **exit 0** — 13/13 en verde |

### Ciclo B — resumen de los datos efectivos y pregunta explícita antes de `(s/N): `

#### TEST creados / modificados

- `tests/presentation/messages.test.ts` (+2 pruebas): `MESSAGES.playlist.summary(nombre, visibilidad, descripcion)` → `Resumen de la playlist: "<nombre>" (<pública|privada>, descripción: "<descripción>")` y `MESSAGES.playlist.confirmPrompt` → `¿Crear la playlist con estos datos? ` (con espacio final).
- `tests/presentation/prompts.test.ts` (+1 prueba): `confirmarCreacion(resumen, lector)` compone `resumen + '\n' + confirmPrompt + '(s/N): '`; sin resumen conserva `FORMATO_CONFIRMACION === '(s/N): '`; `TEXTO_CONFIRMACION` se fija a mano con los literales aprobados; el mini-flujo pasa a invocar `confirmarCreacion(resumen, lector)` y sigue exigiendo que solo `s` minúscula confirme (`S`, `N`, vacío, `N`, `Ctrl+C` cancelan sin crear ni registrar).
- `tests/presentation/crear-playlist.test.ts` (+4 pruebas, agrupadas en «resumen previo a la confirmación (DISC-006)»): el doble de peticiones registra el `resumen` recibido en `resumenes`, y se comprueba (1) el resumen del flujo de menú, (2) el recorte de nombre con descripción por defecto y visibilidad privada, (3) que el comando directo pre-resuelto no pide confirmación ni registra resumen, y (4) que con la visibilidad sin resolver la confirmación se pide con `undefined` (formato aprobado).
- `tests/presentation/menu-crear-playlist.test.ts`, `tests/presentation/comando-crear-playlist.test.ts`, `tests/integration/arnes-e2e.test.ts` y `tests/acceptance/menu-interactivo.test.ts`: la secuencia de peticiones espera el texto completo de la confirmación (resumen + pregunta + `(s/N): `) en lugar del formato suelto; en aceptación los literales se siguen escribiendo a mano.

#### Evidencia RED

- `npx vitest run tests/presentation/prompts.test.ts tests/presentation/crear-playlist.test.ts tests/presentation/messages.test.ts tests/presentation/menu-crear-playlist.test.ts tests/presentation/comando-crear-playlist.test.ts` → **exit 1**: `Test Files 5 failed (5)`, `Tests 14 failed | 81 passed (95)`, `Type Errors no errors`, con fallos por comportamiento ausente: `MESSAGES.playlist.summary is not a function`, `MESSAGES.playlist.confirmPrompt` `undefined`, `TypeError: lector.leer is not a function` (firma antigua de `confirmarCreacion`), `expected [ undefined ] to deeply equal [ { …(3) } ]` en `flujo.resumenes` y `expected '(s/N): ' to be 'Resumen de la playlist: …'` en las secuencias de peticiones.
- `npx vitest run tests/integration/arnes-e2e.test.ts tests/acceptance/menu-interactivo.test.ts` → **exit 1**: `Test Files 2 failed (2)`, `Tests 4 failed | 4 passed (8)`, con los mismos fallos de literal en el arnés y en los dos escenarios de aceptación.
- Total del RED: **18 pruebas en rojo** por ausencia del comportamiento, con `Type Errors no errors` en ambas ejecuciones.

#### Implementación (GREEN)

- `src/presentation/messages.ts`: literales nuevos `playlist.summary` y `playlist.confirmPrompt`, reutilizando `VISIBILIDAD_EXIBIBLE` (misma visibilidad visible que el literal de éxito).
- `src/presentation/prompts.ts`: tipo `ResumenCreacion` (`nombreEfectivo`, `visibilidad`, `descripcionEfectiva`), `textoConfirmacion(resumen?)` —con resumen, línea de resumen, pregunta explícita y `(s/N): `; sin resumen, solo el formato aprobado— y `confirmarCreacion(resumen?, lector)` que lee ese texto.
- `src/presentation/crear-playlist.ts`: `PeticionesCreacion.confirmacion(resumen?)`; `resumenDe(datos)` compone el resumen con los predicados de Business (`recortarNombre`, `resolverVisibilidad`, `resolverDescripcionEfectiva`) y devuelve `undefined` cuando la visibilidad no está resuelta; `resolverCanal(flujo, datos)` pide la confirmación con ese resumen; el canal de confirmación pasa a construirse en `construirSolicitud(datos, flujo)` para que cada solicitud lleve sus propios datos. Se conserva sin cambios el canal pre-resuelto del comando directo (`confirmada` sin peticiones) y la conversión a canal por toda petición interactiva (`duplicadoAceptado` y la opción `2` siguen sin confirmación previa propia).

#### Evidencia GREEN

- `npx vitest run tests/presentation/prompts.test.ts tests/presentation/crear-playlist.test.ts tests/presentation/messages.test.ts tests/presentation/menu-crear-playlist.test.ts tests/presentation/comando-crear-playlist.test.ts` → **exit 0**: `Test Files 5 passed (5)`, `Tests 95 passed (95)`.
- `npx vitest run tests/integration/arnes-e2e.test.ts tests/acceptance/menu-interactivo.test.ts tests/acceptance/comando-directo.test.ts` → **exit 0**: `Test Files 3 passed (3)`, `Tests 11 passed (11)`.

#### Refactorización

Sin cambio de comportamiento: documentación de cabecera del coordinador actualizada con `DISC-006` y con la descripción del canal con resumen; constantes locales `PREGUNTA_CONFIRMACION`/`CONFIRMACION_*` extraídas en las pruebas para no repetir el literal; correcciones de Biome (formato de `resolverCanal` y sustitución de concatenaciones por un único template literal con interpolación). Verificación posterior: los mismos ficheros en verde y `biome check` sin errores.

#### Comprobación de no vaciedad (Ciclo B)

| Paso | Acción | Comando | Resultado |
| --- | --- | --- | --- |
| 1 | Mutación temporal: `textoConfirmacion` ignora el resumen y devuelve siempre `FORMATO_CONFIRMACION` | `npx vitest run tests/presentation/prompts.test.ts tests/presentation/crear-playlist.test.ts tests/presentation/comando-crear-playlist.test.ts` | **exit 1** — 4 fallos: «con resumen antepone el resumen y la pregunta explícita (DISC-006)» y las 3 variantes de reingreso del comando directo, con `expected '(s/N): ' to be 'Resumen de la playlist: …'` |
| 2 | Mutación revertida | `npx vitest run` | **exit 0** — verde restaurado (30 ficheros, 302 pruebas) |

### Validaciones ejecutadas (ambos ciclos)

| Validación | Comando | Resultado |
| --- | --- | --- |
| RED Ciclo A | `npx vitest run tests/data/http/playlists-client.test.ts` | exit 1 — 8 fallos por comportamiento ausente, 0 errores de tipo |
| GREEN Ciclo A | `npx vitest run tests/data/http/playlists-client.test.ts` | exit 0 — 13/13 |
| RED Ciclo B (unidad y presentación) | `npx vitest run tests/presentation/prompts.test.ts tests/presentation/crear-playlist.test.ts tests/presentation/messages.test.ts tests/presentation/menu-crear-playlist.test.ts tests/presentation/comando-crear-playlist.test.ts` | exit 1 — 14 fallos, 0 errores de tipo |
| RED Ciclo B (integración y aceptación) | `npx vitest run tests/integration/arnes-e2e.test.ts tests/acceptance/menu-interactivo.test.ts` | exit 1 — 4 fallos, 0 errores de tipo |
| GREEN Ciclo B | ejecuciones anteriores tras implementar | exit 0 — 95/95 y 11/11 |
| No vaciedad Ciclo A y Ciclo B | mutaciones temporales descritas arriba | exit 1 en cada mutación; revertidas → exit 0 |
| Suite completa (estado final) | `npx vitest run` | exit 0 — **30 ficheros, 302 pruebas**, `Type Errors no errors` (antes 30/295: +7 pruebas nuevas) |
| Compilación estricta | `npx tsc --noEmit` | exit 0 |
| Tipos de pruebas | `npx tsc -p tsconfig.type-tests.json --noEmit` | exit 0 |
| Estática y formato de los 16 ficheros tocados | `npx biome check` sobre `src/data/http/playlists-client.ts`, `src/presentation/{messages,prompts,crear-playlist}.ts` y los 12 ficheros de prueba afectados | exit 0 — `Checked 16 files`, sin errores |
| Complejidad cognitiva < 15, sin `any` y sin reglas de dominio en Presentation | Reglas `complexity/noExcessiveCognitiveComplexity`, `suspicious/noExplicitAny` y `revisarPresentacion` (TC-028) sin incidentes | Cumple |
| Sin secretos expuestos (RNF-001) | TC-028 y las pruebas de aceptación: ninguna salida, registro ni fichero generado contiene testigos, `Bearer`, `access_token` ni `refresh_token`; el resumen de la TUI solo presenta nombre, visibilidad y descripción efectivos | Cumple |
| Sin artefactos aprobados tocados ni commits | `git status --porcelain -- specs/` y `git rev-parse --short HEAD` | Sin entradas nuevas en `specs/`; rama `feat/REQ-003-creacion-de-playlist-vacia`, sin commits nuevos |

### Deuda documental: `CR-002` pendiente de formalizar

`DISC-006` aprobó la dirección (resumen + pregunta explícita) pero no fija el texto exacto. El literal queda **implementado y cubierto por pruebas** con la siguiente redacción, que debe incorporarse al formalizar `CR-002`:

```
Resumen de la playlist: "<nombre efectivo>" (<pública|privada>, descripción: "<descripción efectiva>")
¿Crear la playlist con estos datos? (s/N):
```

(compuesto como `MESSAGES.playlist.summary(...)` + `'\n'` + `MESSAGES.playlist.confirmPrompt` + `FORMATO_CONFIRMACION`; sin resumen —visibilidad no resuelta, inalcanzable en el flujo real— se conserva `(s/N): `).

**No se modificó ningún artefacto aprobado para alojar este literal**: `specs/` queda intacto y la formalización de `CR-002` con el texto anterior queda **pendiente de aprobación humana** antes de declarar `FEATURE_DONE`.
