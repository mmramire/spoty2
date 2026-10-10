# Especificación: Creación de playlist vacía

## 1. Metadatos

- **Identificador**: 003-creacion-de-playlist-vacia
- **Nombre**: Creación de playlist vacía
- **Estado**: DRAFT
- **Versión**: 0.2.0
- **Fecha**: 2026-10-08

## 2. Problema

La aplicación `spoty2` no ofrece actualmente ninguna capacidad para crear una lista de reproducción. El usuario autenticado necesita crear una lista de reproducción vacía asociada a su cuenta desde la interfaz de línea de comandos, como paso previo a futuras funcionalidades de gestión de contenido.

El alcance confirmado se limita a: «crear una playlist vacía desde el CLI spoty2», con las definiciones humanas aprobadas P-001 a P-007 incorporadas en esta versión.

## 3. Objetivos

### OBJ-001: Permitir crear una playlist vacía desde el CLI

Permitir que el usuario autenticado cree una lista de reproducción vacía asociada a su cuenta mediante el CLI `spoty2`, desde comando directo o desde menú interactivo, con nombre, descripción y visibilidad definidos por las decisiones aprobadas, y reciba confirmación del resultado en español estricto con identificador y enlace de Spotify.

## 4. Alcance incluido

- Creación de una playlist vacía desde comando directo `spoty create-new-playlist` con parámetros `--name`, `--description`, `--public` y `--private` según P-001.
- Creación de una playlist vacía desde el menú interactivo principal, opción `4. Crear playlist vacía`, con ayuda, peticiones, lista de visibilidad y confirmación según P-002.
- Exigencia de sesión válida obtenida vía opción 1 y gestión de errores de autenticación, autorización y servicio según P-003.
- Validación de nombre (3-100 caracteres visibles tras recorte) y gestión de duplicados contra listas propias según P-004.
- Mensaje único de éxito con nombre, visibilidad, descripción efectiva, identificador y enlace según P-006.
- Registro técnico con Pino en `data/app.log` sin datos sensibles según P-007.
- Trazabilidad completa `OBJ → RF/RNF → UC → AC` con corrección O-001 (AC-005 incluido en matrices).

## 5. Fuera de alcance

Según definición aprobada P-005, queda explícitamente fuera:

- Añadir canciones a la lista durante o después de su creación.
- Gestionar la portada de la lista.
- Interfaz gráfica, reproducción de audio y sincronización de bibliotecas.
- Listas colaborativas en cualquier punto de entrada.
- Persistencia propia de la operación, salvo el registro técnico en `data/app.log`.
- Gestión de cuotas o límites, salvo el tratamiento de 429 con hasta 3 reintentos definido en P-003.
- Parámetros ocultos o no documentados en esta especificación.

Todo lo enumerado en esta sección queda explícitamente fuera de la especificación aprobada en esta versión.

## 6. Actores y contexto

| Actor | Interés | Responsabilidad |
|---|---|---|
| Usuario autenticado | Crear una lista vacía asociada a su cuenta desde el CLI | Iniciar el flujo desde comando directo o menú, aportar nombre, descripción y visibilidad, y confirmar la creación cuando se solicite |
| Sistema CLI spoty2 | Coordinar la entrada y la salida sin concentrar reglas de negocio | Delegar la operación a la capa de negocio y presentar mensajes en español estricto |
| Plataforma Spotify (externa) | Proveer el servicio de creación de listas | Crear la lista asociada al usuario según la sesión vigente y devolver identificador y enlace |

## 7. Comportamiento esperado

Describe el comportamiento observable sin decidir la implementación interna.

### Flujo general

`Usuario autenticado → Comando directo o menú interactivo → Validación y control de duplicados → Creación en Spotify → Confirmación en español con identificador y enlace`

### Puntos de inicio

Para cada flujo, queda identificado el elemento concreto que inicia la funcionalidad:

- CLI: comando único `spoty create-new-playlist` con `--name "..."` obligatorio, `--description` opcional y visibilidad obligatoria `--public | --private` excluyentes. Ejemplos aprobados: `--name "Viaje 2026" --private`; `--name "Viaje 2026" --private --description "Carretera"`; `--name "Viaje 2026" --public --description "Carretera"`; `--name "Viaje 2026" --public` con descripción por defecto `"Playlist sin descripción"`.
- Menú interactivo: opción `4. Crear playlist vacía` del menú principal, con ayuda `(navega con 0-4,9, Ctrl+C para cancelar)`. La combinación de teclas `Ctrl+C` aborta sin crear en cualquier petición.
- GUI: no aplica.
- Evento: no aplica.
- API programática: no aplica como punto de entrada de usuario en esta feature; la reutilización futura por clientes no CLI se conserva como restricción transversal.

Cada punto de inicio tiene su `Disparador / punto de inicio` concreto en `USE_CASES.md` y cobertura en `ACCEPTANCE_CRITERIA.feature`.

### Detalle aprobado por decisión

- P-001 (CLI directo): el nombre se mide en caracteres visibles tras recortar espacios en extremos; vacío o solo espacios es inválido. Longitud válida de 3 a 100. Ante longitud inválida en comando directo, el sistema muestra `Error en longitud del nombre de la playlist, mínimo 3, máximo 100 caracteres totales.` y continúa en modo interactivo con la petición `Nombre de la playlist (3-100 caracteres):`. La descripción es opcional; por defecto `"Playlist sin descripción"`. La visibilidad es obligatoria y excluyente; si falta o si aparecen ambos indicadores, el sistema muestra `Se debe declarar flag único en comando --public o --private`. La modalidad colaborativa queda fuera.
- P-002 (menú): peticiones `Nombre de la playlist (3-100 caracteres):` y `Descripción (opcional, Enter para usar "Playlist sin descripción"):`. Lista de visibilidad con pública preseleccionada, equivalente a los indicadores del comando. Confirmación final con formato `(s/N): ` según convención existente: solo `s` confirma; `N` u otra respuesta vuelve al menú sin crear. `Ctrl+C` aborta sin crear.
- P-003 (autenticación y servicio): la sesión válida se obtiene siempre vía opción 1; sin sesión el sistema muestra `No hay sesión activa. Conecta con Spotify con la opción 1`. Los ámbitos `playlist-modify-public` y `playlist-modify-private` ya están incluidos en `REQUIRED_SCOPES` (`src/business/auth/types.ts`), sin cambio en la conexión. Ante 401 el sistema muestra `Sesión caducada. Vuelve a conectar con Spotify.`. Ante 403 muestra `Permisos insuficientes para crear la playlist.`. Ante 429 reintenta hasta 3 veces; respeta la cabecera `Retry-After` cuando la respuesta la incluye (comportamiento verificado en la documentación oficial de Spotify, que indica esperar los segundos señalados) y, en su ausencia, espera 10 segundos entre intentos; tras agotar los reintentos muestra `Vuelva a intentarlo más tarde`. Ante fallo genérico muestra `No se pudo crear la playlist por un error inesperado.` y registra la causa para depuración sin datos sensibles.
- P-004 (validación y duplicados): vacío equivale a cadena vacía o solo espacios. No existe lista propia de caracteres inválidos; rige lo que rechace Spotify. La comprobación de duplicados se realiza solo contra listas propias del usuario, con comparación exacta sensible a mayúsculas tras recortar espacios (`Viaje` es distinto de `viaje`). Ante duplicado el sistema muestra `Ya existe una playlist llamada "X".` (con el nombre efectivo) y el menú `¿Qué deseas hacer? 1. Modificar nombre 2. Crear de todos modos con el mismo nombre 0. Cancelar sin crear / Elige (0-2):`. La opción 1 repite la petición de nombre y después pregunta `¿Deseas modificar descripción y visibilidad? (s/N): `. La opción 2 continúa hacia la confirmación final. La opción 0 muestra `Creación cancelada. No se creó ninguna playlist.` y no crea nada. El duplicado se registra como advertencia con el nombre.
- P-006 (éxito): el mismo mensaje en CLI y menú es `Playlist creada: "X" (pública/privada, descripción: "...", id: ..., enlace: ...)` con el identificador y el enlace devueltos por Spotify.
- P-007 (registro): registro con Pino en `data/app.log` sin exponer tokens. Nivel `info` al iniciar y al completar con éxito (nombre, visibilidad, descripción efectiva e identificador). Nivel `warn` ante duplicado (con nombre) y ante cada reintento por 429 (con intento y estado). Nivel `error` ante fallo final con causa, sin cuerpo sensible. Las cancelaciones del usuario no generan registro.

## 8. Reglas de negocio

- BR-001: Solo un usuario con sesión válida obtenida vía opción 1 puede completar la creación; sin sesión se informa con `No hay sesión activa. Conecta con Spotify con la opción 1` y no se crea nada.
- BR-002: El resultado de una operación exitosa es una única lista de reproducción vacía asociada al usuario solicitante, con nombre de 3 a 100 caracteres visibles, descripción efectiva y visibilidad pública o privada.
- BR-003: Ante un fallo, el sistema no deja estado ambiguo y lo informa en español con los mensajes exactos de P-003 y P-004.
- BR-004: El nombre vacío (vacío o solo espacios) o fuera de 3-100 caracteres visibles es inválido; en comando directo se muestra `Error en longitud del nombre de la playlist, mínimo 3, máximo 100 caracteres totales.` y se continúa en interactivo.
- BR-005: La visibilidad es obligatoria y excluyente (`--public` o `--private`); la lista colaborativa no se admite. En menú la pública aparece preseleccionada con equivalencia total a los indicadores.
- BR-006: Ante nombre duplicado contra listas propias (comparación exacta sensible a mayúsculas tras recorte) se advierte y se ofrecen las tres opciones definidas; solo la confirmación explícita crea la lista.
- BR-007: La confirmación final usa la convención `(s/N): `; solo `s` confirma. `Ctrl+C` y la opción 0 de duplicados cancelan sin crear y muestran `Creación cancelada. No se creó ninguna playlist.` cuando corresponde al flujo de duplicados.

## 9. Restricciones

- Arquitectura en capas `Presentation → Business → Data`; la capa de negocio no depende del CLI ni realiza entrada o salida directa; los efectos de datos quedan encapsulados en la capa de datos y la operación queda reutilizable por futuros clientes no CLI.
- Compatibilidad futura con empaquetado como binario ejecutable único vía Node.js SEA; no se impondrán requisitos de ejecución que impidan dicha compilación.
- Documentación y mensajes de usuario en español estricto.
- Seguridad: ningún token, secreto o credencial en registros, consola ni ficheros generados; registro técnico mediante Pino en `data/app.log` cuando corresponda.
- Base tecnológica transversal sin nuevas dependencias: Node.js 22 o superior, TypeScript estricto, ESM, Biome y Vitest.
- Desarrollo posterior bajo TDD (`RED → GREEN → REFACTOR`) una vez exista especificación aprobada y revisión especializada.
- No se diseña la implementación concreta en esta fase.

## 10. Supuestos y preguntas abiertas

### Supuestos

- La carpeta `specs/003-creacion-de-playlist-vacia/` contiene únicamente los artefactos de especificación en versión 0.2.0; no existe aprobación para arquitectura, tareas ni implementación.
- Las definiciones P-001 a P-007 son definiciones humanas aprobadas e incorporadas literalmente, sin comportamiento adicional inventado.
- Los ámbitos `playlist-modify-public` y `playlist-modify-private` ya existen en `REQUIRED_SCOPES` (`src/business/auth/types.ts`); no se requiere cambio en la conexión.
- La política de 429 respeta `Retry-After` cuando existe (verificado en la documentación oficial de Spotify) y aplica espera de 10 segundos en su ausencia, con máximo de 3 reintentos.
- Se conservan las políticas transversales de `AGENTS.md`: idioma, trazabilidad, gates, TDD posterior, seguridad y compatibilidad SEA.
- El estado permanece `DRAFT` hasta nueva revisión del revisor de especificación más aprobación humana explícita; no se declara `SPEC_READY` en esta versión.

### Preguntas abiertas

No quedan preguntas abiertas. Las 7 preguntas P-001 a P-007 de la versión 0.1.0 quedan cerradas con las definiciones aprobadas incorporadas. El cierre C-1 a C-6 queda registrado como confirmación de alcance y detención: sin arquitectura, sin tareas, sin implementación y sin declaración de `SPEC_READY` hasta nueva revisión.

## 11. Resultado esperado

El usuario autenticado crea desde el CLI (comando directo o menú) una lista vacía asociada a su cuenta, con nombre validado, descripción efectiva y visibilidad pública o privada, y recibe confirmación en español con identificador y enlace. Ante errores de sesión, autorización, límite, validación o duplicados, recibe los mensajes exactos definidos y el sistema registra el evento técnico sin datos sensibles.

## 12. Trazabilidad

| Objetivo | Requisitos | Casos de uso | Criterios |
|---|---|---|---|
| OBJ-001 | RF-001, RF-002 | UC-001 | AC-001, AC-002, AC-003, AC-004, AC-005 |
| OBJ-001 | RNF-001, RNF-002, RNF-006 | UC-001 | AC-001, AC-002, AC-003, AC-004, AC-005 |
| OBJ-001 | RNF-003, RNF-004, RNF-005 | UC-001 | — (verificación posterior en arquitectura e implementación) |

Nota: trazabilidad de especificación completa a nivel `OBJ → RF/RNF → UC → AC` con corrección O-001. Las tareas, pruebas, código y validación quedan pendientes (`TASK`, `TC`, `CODE` y `VALIDATION` sin asignar) porque no se avanza a arquitectura, tareas ni implementación.

## 13. Historial de cambios

| Versión | Fecha | Cambio | Motivo |
|---|---|---|---|
| 0.1.0 | 2026-10-07 | Creación del borrador sin asumir comportamiento no definido | Solicitud limitada a «crear una playlist vacía desde el CLI spoty2»; preguntas bloqueantes pendientes |
| 0.2.0 | 2026-10-08 | Incorporación de definiciones aprobadas P-001 a P-007 y cierre C-1 a C-6; requisitos verificables; AC-005 en matrices (O-001); sin carácter bloqueante | Definiciones humanas aprobadas; queda pendiente nueva revisión del revisor de especificación |
