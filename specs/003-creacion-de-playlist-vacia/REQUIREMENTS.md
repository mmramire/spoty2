# Requisitos: Creación de playlist vacía

## 1. Requisitos funcionales

| ID | Descripción | Prioridad | Objetivo | Estado |
|---|---|---|---|---|
| RF-001 | El sistema debe permitir al usuario autenticado crear una playlist vacía asociada a su cuenta desde el comando directo `spoty create-new-playlist` y desde la opción `4. Crear playlist vacía` del menú interactivo. El nombre es obligatorio y debe tener entre 3 y 100 caracteres visibles tras recortar espacios en extremos (vacío o solo espacios inválido); la descripción es opcional con valor por defecto `"Playlist sin descripción"`; la visibilidad es obligatoria y excluyente (`--public` o `--private`, sin modalidad colaborativa). El sistema debe validar la longitud, exigir un único indicador de visibilidad, comprobar duplicados solo contra listas propias con comparación exacta sensible a mayúsculas tras recorte, y exigir sesión válida obtenida vía opción 1 con los ámbitos `playlist-modify-public` y `playlist-modify-private` ya incluidos en `REQUIRED_SCOPES`. | Must | OBJ-001 | Definido |
| RF-002 | El sistema debe informar el resultado de la creación en español estricto con los mensajes exactos aprobados: éxito con `Playlist creada: "X" (pública/privada, descripción: "...", id: ..., enlace: ...)` incluyendo identificador y enlace; longitud inválida con `Error en longitud del nombre de la playlist, mínimo 3, máximo 100 caracteres totales.`; visibilidad inválida con `Se debe declarar flag único en comando --public o --private`; sin sesión con `No hay sesión activa. Conecta con Spotify con la opción 1`; 401 con `Sesión caducada. Vuelve a conectar con Spotify.`; 403 con `Permisos insuficientes para crear la playlist.`; 429 agotado con `Vuelva a intentarlo más tarde`; fallo genérico con `No se pudo crear la playlist por un error inesperado.`; duplicado con `Ya existe una playlist llamada "X".` y menú de tres opciones; cancelación con `Creación cancelada. No se creó ninguna playlist.`. La confirmación final usa el formato `(s/N): ` donde solo `s` confirma. | Must | OBJ-001 | Definido |

No se definen requisitos funcionales adicionales en esta versión. Queda fuera lo dispuesto en P-005: canciones, portada, interfaz gráfica, reproducción, sincronización, modalidad colaborativa, persistencia salvo `data/app.log`, cuotas salvo 429 con hasta 3 reintentos, y parámetros ocultos.

## 2. Requisitos no funcionales

| ID | Categoría | Descripción | Métrica / criterio | Prioridad | Estado |
|---|---|---|---|---|---|
| RNF-001 | Seguridad | Ningún token, secreto, credencial ni dato personal innecesario debe aparecer en registros, consola ni ficheros generados. Los registros de depuración ante fallo genérico omiten cuerpos sensibles. | Revisión de código y de registros sin patrones de token | Must | Definido |
| RNF-002 | Idioma | Toda documentación y todo mensaje de usuario deben estar en español estricto, incluidos mensajes, peticiones, menús y confirmaciones con los literales exactos aprobados. | Revisión lingüística sin infracciones relevantes | Must | Definido |
| RNF-003 | Arquitectura | La solución deberá respetar las capas `Presentation → Business → Data`, sin dependencia de la capa de negocio respecto del CLI y con efectos de datos encapsulados y reutilizables por futuros clientes no CLI. | Revisión de arquitectura posterior | Must | Definido |
| RNF-004 | Compatibilidad | El diseño no debe incorporar requisitos de ejecución que impidan el empaquetado futuro como binario único vía Node.js SEA. | Revisión de arquitectura posterior | Must | Definido |
| RNF-005 | Calidad | El desarrollo posterior deberá usar TypeScript en modo estricto, Biome sin errores, Vitest y TDD (`RED → GREEN → REFACTOR`), con complejidad cognitiva menor de 15 por función. | Salida de herramientas y `TDD_LOG.md` en fase de implementación | Must | Definido |
| RNF-006 | Observabilidad | La operación debe dejar registro técnico con Pino en `data/app.log` sin datos sensibles: `info` al iniciar y al completar con éxito (nombre, visibilidad, descripción efectiva e identificador); `warn` ante duplicado (con nombre) y ante cada reintento por 429 (con intento y estado); `error` ante fallo final con causa sin cuerpo sensible. Las cancelaciones del usuario no generan registro. | Revisión de registros sin datos sensibles y con eventos exigidos | Should | Definido |

## 3. Dependencias y exclusiones

### Dependencias

- Sesión de usuario válida obtenida vía opción 1, con ámbitos `playlist-modify-public` y `playlist-modify-private` ya incluidos en `REQUIRED_SCOPES` (`src/business/auth/types.ts`); sin cambio en la conexión.
- Plataforma externa de Spotify para la creación efectiva de la lista, con códigos 401, 403 y 429 tratados según P-003 y cabecera `Retry-After` respetada cuando existe.
- Base transversal del proyecto: Node.js 22 o superior, TypeScript, ESM, Biome, Vitest y Pino. Sin dependencias adicionales.

### Exclusiones

- Añadir canciones, gestionar portadas, interfaz gráfica, reproducción y sincronización.
- Modalidad colaborativa.
- Persistencia propia salvo `data/app.log`.
- Cuotas o límites salvo 429 con hasta 3 reintentos.
- Parámetros ocultos o no documentados.

## 4. Criterios de verificabilidad

Cada requisito puede comprobarse mediante uno o más `AC-XXX`, pruebas o evidencia técnica. RF-001 y RF-002 son verificables mediante AC-001 a AC-005 ejecutables, que cubren resultado final y puntos de entrada (comando directo y menú). RNF-001 se verifica con AC-004; RNF-002 con AC-001 a AC-005; RNF-006 con AC-001, AC-004 y AC-005. RNF-003, RNF-004 y RNF-005 se verifican en arquitectura e implementación posteriores.

## 5. Matriz de trazabilidad

| Requisito | Caso de uso | Criterio | Tarea | Test |
|---|---|---|---|---|
| RF-001 | UC-001 | AC-001, AC-002, AC-003, AC-005 | Pendiente | Pendiente |
| RF-002 | UC-001 | AC-001, AC-004, AC-005 | Pendiente | Pendiente |
| RNF-001 | UC-001 | AC-004 | Pendiente | Pendiente |
| RNF-002 | UC-001 | AC-001, AC-002, AC-003, AC-004, AC-005 | Pendiente | Pendiente |
| RNF-003 | UC-001 | — (verificación posterior en arquitectura) | Pendiente | Pendiente |
| RNF-004 | UC-001 | — (verificación posterior en arquitectura) | Pendiente | Pendiente |
| RNF-005 | UC-001 | — (verificación posterior en implementación) | Pendiente | Pendiente |
| RNF-006 | UC-001 | AC-001, AC-004, AC-005 | Pendiente | Pendiente |

No se asignan tareas, pruebas ni código en esta fase. La inclusión de AC-005 en las filas de RF-001, RF-002, RNF-002 y RNF-006 corrige la observación O-001 sin renumerar identificadores.

## 6. Criterios de aceptación derivados

### RF-001

- El usuario puede crear la lista desde `spoty create-new-playlist` con `--name` obligatorio, `--description` opcional y un único indicador `--public` o `--private`.
- El usuario puede crear la lista desde la opción `4. Crear playlist vacía` con peticiones, lista de visibilidad con pública preseleccionada y confirmación `(s/N): `.
- El nombre se valida en 3-100 caracteres visibles tras recorte; el duplicado se detecta solo contra propias con comparación exacta sensible a mayúsculas y ofrece las tres opciones aprobadas.
- Sin sesión válida obtenida vía opción 1 la creación no procede.

### RF-002

- Ante éxito, el usuario recibe `Playlist creada: "X" (pública/privada, descripción: "...", id: ..., enlace: ...)` con identificador y enlace, igual en CLI y menú.
- Ante cada error, el usuario recibe el mensaje exacto correspondiente en español sin estado ambiguo.
- Ante cancelación (opción 0 de duplicados, respuesta distinta de `s` en confirmación, o `Ctrl+C`), no se crea ninguna lista.

### RNF-006

- El registro Pino en `data/app.log` contiene `info` de inicio y éxito, `warn` de duplicado y de reintento 429, y `error` final con causa, sin tokens ni cuerpos sensibles.
- Las cancelaciones del usuario no generan registro.

## 7. Historial de cambios

| Versión | Fecha | Cambio | Motivo |
|---|---|---|---|
| 0.1.0 | 2026-10-07 | Creación del borrador con dos requisitos funcionales genéricos y seis no funcionales transversales | Evitar inventar comportamiento; registrar pendientes como bloqueantes |
| 0.2.0 | 2026-10-08 | RF-001, RF-002 y RNF-006 pasan a verificables con definiciones P-001 a P-007; AC-005 incluido en matrices (corrección O-001) | Definiciones humanas aprobadas; sin renumerar identificadores |
