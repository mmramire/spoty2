# Casos de uso: Creación de playlist vacía

## UC-001: Crear playlist vacía desde el CLI

### Actor

Usuario autenticado de `spoty2` que desea crear una lista de reproducción vacía asociada a su cuenta.

### Objetivo

Obtener una playlist vacía asociada a la cuenta del usuario, con nombre validado, descripción efectiva y visibilidad pública o privada, e informar del resultado en español con identificador y enlace de Spotify.

### Precondiciones

- El CLI `spoty2` está disponible para el usuario.
- El usuario dispone de sesión válida obtenida vía opción 1, con ámbitos `playlist-modify-public` y `playlist-modify-private` ya incluidos en `REQUIRED_SCOPES`; sin sesión se aplica UC-001-E1.
- El menú principal muestra la opción `4. Crear playlist vacía` con ayuda `(navega con 0-4,9, Ctrl+C para cancelar)`.

### Disparador / punto de inicio

Disparadores validados, uno por vía de acceso:

- Vía comando directo: invocación `spoty create-new-playlist --name "..." [--description "..."] (--public | --private)`. El parámetro `--name` es obligatorio; `--description` es opcional; la visibilidad es obligatoria y excluyente.
- Vía menú interactivo: selección de la opción `4. Crear playlist vacía` dentro del modo interactivo de `spoty`.

### Flujo principal

1. El usuario invoca uno de los disparadores validados.
2. El sistema comprueba que existe sesión válida; si no existe, deriva a UC-001-E1.
3. El sistema obtiene nombre, descripción y visibilidad:
    - En comando directo usa `--name`, `--description` y `--public | --private`; si la longitud del nombre es inválida, muestra `Error en longitud del nombre de la playlist, mínimo 3, máximo 100 caracteres totales.` y continúa con la petición `Nombre de la playlist (3-100 caracteres):`; si falta la visibilidad o aparecen ambos indicadores, muestra `Se debe declarar flag único en comando --public o --private` y no continúa hasta corregir la invocación.
    - En menú muestra `Nombre de la playlist (3-100 caracteres):`, después `Descripción (opcional, Enter para usar "Playlist sin descripción"):` y después la lista de visibilidad con pública preseleccionada.
4. El sistema valida el nombre (3-100 caracteres visibles tras recortar espacios; vacío o solo espacios inválido) y comprueba duplicados solo contra listas propias con comparación exacta sensible a mayúsculas tras recorte; si hay duplicado, deriva a UC-001-A1; si la entrada es inválida sin duplicado aplicable, deriva a UC-001-E3.
5. El sistema solicita confirmación final con formato `(s/N): `; solo `s` confirma; `N` u otra respuesta vuelve al menú sin crear; `Ctrl+C` aborta sin crear en cualquier petición.
6. El sistema solicita la creación de la playlist vacía a Spotify con nombre, descripción efectiva y visibilidad; ante 401, 403, 429 o fallo genérico deriva a UC-001-E2 (con hasta 3 reintentos ante 429, respetando `Retry-After` cuando existe y esperando 10 segundos en su ausencia).
7. El sistema presenta el mensaje único de éxito `Playlist creada: "X" (pública/privada, descripción: "...", id: ..., enlace: ...)` con identificador y enlace, igual en CLI y menú, y registra el éxito con Pino en `data/app.log`.

### Flujos alternativos

#### UC-001-A1: Nombre duplicado contra listas propias

1. El sistema muestra `Ya existe una playlist llamada "X".` con el nombre efectivo.
2. El sistema muestra el menú `¿Qué deseas hacer? 1. Modificar nombre 2. Crear de todos modos con el mismo nombre 0. Cancelar sin crear / Elige (0-2):` y registra advertencia con el nombre.
3. Si el usuario elige 1, el sistema repite la petición de nombre y después pregunta `¿Deseas modificar descripción y visibilidad? (s/N): `; con `s` repite esas peticiones, con otra respuesta conserva los valores y vuelve al paso 5 del flujo principal.
4. Si el usuario elige 2, el flujo continúa en el paso 5 del flujo principal hacia la confirmación final.
5. Si el usuario elige 0, el sistema muestra `Creación cancelada. No se creó ninguna playlist.` y termina sin crear y sin registrar.

### Flujos de error

#### UC-001-E1: Sin sesión válida

1. El sistema detecta que no existe sesión válida.
2. El sistema muestra `No hay sesión activa. Conecta con Spotify con la opción 1` y no crea ninguna lista.

#### UC-001-E2: Fallo de autorización, de servicio o de límite

1. La creación no puede completarse por 401, 403, 429 persistente o fallo genérico de red o servicio.
2. Ante 401 el sistema muestra `Sesión caducada. Vuelve a conectar con Spotify.`; ante 403 muestra `Permisos insuficientes para crear la playlist.`; ante 429 agotado tras hasta 3 reintentos (respetando `Retry-After` o 10 segundos) muestra `Vuelva a intentarlo más tarde`; ante fallo genérico muestra `No se pudo crear la playlist por un error inesperado.` y registra la causa para depuración sin datos sensibles.
3. No se crea ninguna lista válida y no queda estado ambiguo.

#### UC-001-E3: Entrada inválida

1. El nombre resulta vacío (vacío o solo espacios) o fuera de 3-100 caracteres visibles, o la visibilidad falta o es doble en comando directo.
2. En comando directo con longitud inválida, el sistema muestra `Error en longitud del nombre de la playlist, mínimo 3, máximo 100 caracteres totales.` y continúa en interactivo con `Nombre de la playlist (3-100 caracteres):`; con visibilidad inválida muestra `Se debe declarar flag único en comando --public o --private`. En menú repite la petición correspondiente. No rige lista propia de caracteres inválidos; lo que rechace Spotify se trata como fallo genérico en UC-001-E2.
3. Mientras la entrada siga inválida no se crea ninguna lista.

### Postcondiciones

- Ante éxito: existe una única playlist vacía asociada al usuario con nombre, descripción efectiva y visibilidad, el usuario recibió el mensaje de éxito con identificador y enlace, y quedó registro `info` de inicio y éxito en `data/app.log`.
- Ante fallo: no existe lista nueva válida, el usuario recibió el mensaje exacto correspondiente en español, y quedó registro `warn` o `error` según el caso, sin datos sensibles.
- Ante cancelación (opción 0, respuesta distinta de `s` en confirmación, o `Ctrl+C`): no se creó ninguna lista, se informó al usuario cuando corresponde al flujo, y no quedó registro.

### Reglas de negocio

- BR-001: solo una sesión válida obtenida vía opción 1 permite completar la creación.
- BR-002: el resultado exitoso es una única lista vacía asociada al solicitante con atributos validados.
- BR-003: ante fallo no queda estado ambiguo y se informa en español con mensajes exactos.
- BR-004: nombre de 3-100 caracteres visibles tras recorte; vacío o solo espacios inválido.
- BR-005: visibilidad obligatoria y excluyente; sin modalidad colaborativa.
- BR-006: duplicados solo contra propias, comparación exacta sensible a mayúsculas tras recorte, con menú de tres opciones.
- BR-007: confirmación final `(s/N): ` donde solo `s` confirma; cancelaciones sin crear ni registrar.

### Requisitos relacionados

- RF-001
- RF-002
- RNF-001
- RNF-002
- RNF-006

### Criterios relacionados

- AC-001
- AC-002
- AC-003
- AC-004
- AC-005

## Resumen de actores y entradas

| Caso de uso | Actor | Punto de inicio | Resultado |
|---|---|---|---|
| UC-001 | Usuario autenticado | Comando `spoty create-new-playlist ...` y opción `4. Crear playlist vacía` del menú | Playlist vacía asociada al usuario y confirmación en español con identificador y enlace; errores y cancelaciones sin crear |
