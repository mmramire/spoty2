# Casos de Uso: Descarga de Biblioteca de Canciones

## Actores

| Actor | Descripción | Tipo |
|-------|-------------|------|
| Usuario Autenticado | Usuario que ya completó el flujo OAuth y tiene tokens válidos guardados | Primario |
| Sistema (spoty CLI) | Aplicación que orquesta la descarga | Sistema |

---

## UC-001: Descarga exitosa de biblioteca completa

### Precondiciones
- Usuario tiene sesión válida (tokens en `data/tokens.json` no expirados)
- Usuario tiene al menos 1 track guardado en Spotify
- Conexión a internet disponible
- Espacio en disco suficiente (> 50MB para 3000 tracks)

### Flujo Principal
1. Usuario ejecuta `spoty download-songs` (o opción 3 en menú interactivo)
2. Sistema valida sesión existente (reutiliza `checkExistingSession()`)
3. Sistema obtiene access token válido (refresh si necesario)
4. Sistema inicia descarga paginada:
   - Request `GET /me/tracks?limit=50&offset=0`
   - Recibe página 1 (hasta 50 tracks con `addedAt`)
   - Si `next !== null`: request siguiente página con `offset += 50`
   - Repetir hasta `next === null`
5. Sistema transforma datos a estructura JSON de salida (SPECS.md §4)
6. Sistema genera nombre archivo: `YYYY-MM-DD_HH-mm-ss-download_songs.json` (fecha/hora de inicio, ej: `2026-10-06_14-30-45-download_songs.json`)
7. Sistema escribe archivo en carpeta `downloads/` por defecto (o `--output-dir` / `outputDir` si se especifica); crea la carpeta con `mkdir recursive`
8. Sistema muestra mensaje éxito con ruta archivo y estadísticas
9. Sistema registra en `data/app.log`: inicio de descarga, tracks obtenidos, descarga completada con ruta; ante error registra `Error durante descarga: <mensaje>`

### Flujos Alternativos

#### FA-001: Biblioteca vacía (0 tracks)
- En paso 4, primera página devuelve `total: 0, items: []`
- Sistema crea JSON con `totalTracks: 0, tracks: []`
- Muestra mensaje: "Tu biblioteca está vacía. Archivo creado con 0 tracks."

#### FA-002: Directorio de salida personalizado (`--output-dir`)
- En paso 1, usuario proporciona `--output-dir /ruta/personalizada`
- En paso 7, archivo se escribe en directorio especificado
- Validar escritura antes de iniciar descarga

#### FA-003: Archivo ya existe (sobrescritura)
- En paso 6, nombre de archivo ya existe en destino
- Sistema sobrescribe sin confirmación (comportamiento CLI estándar)
- Opcional: flag `--force` para confirmar, `--no-clobber` para error

### Postcondiciones
- Archivo `downloads/YYYY-MM-DD_HH-mm-ss-download_songs.json` existe y es JSON válido
- Contiene todos los tracks de la biblioteca al momento de descarga
- `metadata.totalTracks` == número real de tracks descargados
- Log en `data/app.log` registra inicio, tracks obtenidos y operación exitosa (o error)
- Sesión OAuth intacta (tokens no modificados)

### Reglas de Negocio
- **RB-001**: Scope `user-library-read` debe estar presente en token
- **RB-002**: Máximo 50 tracks por request (límite API Spotify)
- **RB-003**: Fecha y hora en nombre de archivo = fecha/hora inicio descarga (formato `YYYY-MM-DD_HH-mm-ss`)
- **RB-004**: `addedAt` preservado tal cual de API (ISO 8601 UTC)

---

## UC-002: Manejo de Rate Limit (HTTP 429)

### Precondiciones
- Mismas que UC-001
- Spotify API devuelve HTTP 429 en alguna request de paginación

### Flujo Principal
1. Sistema hace request `GET /me/tracks?limit=50&offset=X`
2. Spotify responde HTTP 429 con cabecera `Retry-After: N`
3. Sistema loggea `WARN`: "Rate limit alcanzado. Esperando N segundos..."
4. Sistema espera `N` segundos (mínimo 1s)
5. Sistema reintenta mismo request (mismo offset)
6. Si éxito: continúa paginación normal
7. Si nuevo 429: backoff exponencial (2×N, 4×N... máx 60s)
8. Máximo 5 reintentos totales por request

### Flujos Alternativos

#### FA-001: Agotados reintentos (5 fallos consecutivos)
- Tras 5 reintentos fallidos, sistema aborta descarga
- Error: "Rate limit persistente tras 5 reintentos. Intenta más tarde."
- Código salida: 1
- Tracks ya descargados NO se guardan (transaccionalidad: todo o nada)
- Log `ERROR` con detalles

### Postcondiciones
- Si éxito: continúa UC-001 normal
- Si fallo: sin archivo parcial, error claro, log completo

### Reglas de Negocio
- **RB-005**: Respetar `Retry-After` siempre (no asumir valor fijo)
- **RB-006**: Backoff exponencial con jitter (±10%) para evitar thundering herd
- **RB-007**: Contador de reintentos por request individual (no global)

---

## UC-003: Refresh de Token Expirado Durante Descarga

### Precondiciones
- Mismas que UC-001
- Access token expira durante la descarga (HTTP 401 en request de paginación)

### Flujo Principal
1. Sistema hace request `GET /me/tracks?limit=50&offset=X`
2. Spotify responde HTTP 401 (token expirado)
3. Sistema detecta 401 y llama `refreshAccessToken(refreshToken)`
4. Spotify devuelve nuevo `access_token` (+ opcional nuevo `refresh_token`)
5. Sistema actualiza tokens en almacenamiento (`tokens.json`)
6. Sistema reintenta request fallido con nuevo access token
7. Si éxito: continúa paginación normal
8. Si refresh falla (400/401 en refresh): error "Sesión expirada completamente"

### Flujos Alternativos

#### FA-001: Refresh Token también expirado (HTTP 400/401 en /token)
- Sistema borra tokens inválidos (`clearStoredTokens()`)
- Error: "Tu sesión ha expirado. Ejecuta 'spoty connect' para reconectar."
- Código salida: 2 (config/auth error)
- No se guarda archivo parcial

#### FA-002: Error de red durante refresh
- Aplicar reintentos (máx 2) con backoff
- Si persiste: error genérico de red

### Postcondiciones
- Si refresh exitoso: tokens actualizados, descarga continúa
- Si fallo crítico: sesión limpiada, usuario guiado a reconectar

### Reglas de Negocio
- **RB-008**: Refresh automático transparente al usuario (sin prompt)
- **RB-009**: Nuevo refresh_token (si viene) debe persistirse
- **RB-010**: Tracks ya descargados en memoria se conservan durante refresh

---

## UC-004: Descarga con Directorio de Salida Personalizado

### Precondiciones
- Mismas que UC-001
- Usuario especifica `--output-dir /ruta/valida` o `-o /ruta/valida`

### Flujo Principal
1. CLI parsea flag `--output-dir` / `-o`
2. Valida: directorio existe Y es escribible
3. Si no existe y flag `--create-dir`: crear recursivamente
4. Si no existe y sin `--create-dir`: error "Directorio no existe"
5. Ejecuta UC-001 paso 3-9 usando directorio especificado

### Flujos Alternativos

#### FA-001: Directorio no escribible (permisos)
- Error: "Sin permisos de escritura en /ruta/especificada"
- Código salida: 3 (I/O error)

#### FA-002: Path traversal attempt (`--output-dir ../../etc`)
- Validar ruta resuelta está dentro de directorios permitidos
- Error: "Ruta de salida no permitida"

### Postcondiciones
- Archivo en directorio especificado
- Resto igual a UC-001

---

## UC-005: Cancelación por Usuario (Ctrl+C)

### Precondiciones
- Descarga en progreso (UC-001 paso 4)

### Flujo Principal
1. Usuario presiona Ctrl+C (SIGINT)
2. Sistema captura señal
3. Sistema cancela requests pendientes (AbortController)
4. Sistema NO escribe archivo parcial
5. Sistema muestra: "Descarga cancelada por el usuario"
6. Código salida: 130 (SIGINT estándar)

### Postcondiciones
- Sin archivo de salida creado
- Log `WARN`: "Descarga cancelada por usuario en track X/Y"
- Sesión OAuth intacta

---

## UC-006: Opción de Menú Interactivo para Descargar Biblioteca

### Precondiciones
- Usuario está en el menú interactivo de spoty
- Opción 3 "Descargar biblioteca" ha sido seleccionada
- (Opcional) Sesión válida con tokens guardados

### Flujo Principal
1. Usuario selecciona la opción 3 "Descargar biblioteca" en el menú interactivo
2. Sistema verifica la existencia de tokens guardados mediante `getStoredTokens()`
3. Si no hay tokens: muestra mensaje de error "Configuración requerida. Ejecuta "spoty connect" para configurar." y regresa al menú
4. Si hay tokens: sistema inicia el flujo de descarga ejecutando `downloadSongs({})`
5. Sistema muestra sección "Descargando biblioteca..." en consola
6. Se ejecuta la descarga paginada (mismo flujo que `spoty download-songs`)
7. Al completar: muestra mensaje "¡Descarga completada! X tracks guardados en downloads/YYYY-MM-DD_HH-mm-ss-download_songs.json"
8. Regresa al menú principal después de completar o cancelar

### Flujos Alternativos

#### FA-001: Usuario sin sesión activa
- En paso 2, no hay tokens guardados
- Mostrar error: "Primero debes conectar con Spotify usando la opción 1."
- Regresar al menú principal sin iniciar descarga

#### FA-002: Cancelación durante la descarga desde el menú
- Igual que FA-001 de UC-005 (Ctrl+C durante la descarga)
- El sistema debe manejar la señal SIGINT correctamente
- No debe dejar archivo parcial creado

### Postcondiciones
- Si éxito: archivo `downloads/YYYY-MM-DD_HH-mm-ss-download_songs.json` existe con todos los tracks
- Si cancelación: no existe archivo parcial, sesión intacta
- Regresa al menú principal de spoty

### Flujos de Excepción
- **UC-001**: Biblioteca vacía (0 tracks), Directorio personalizado, Sobrescritura de archivo
- **UC-002**: Rate limit persistente (5 reintentos fallados), Agotamiento de reintentos
- **UC-003**: Refresh token expirado, Error de red durante refresh
- **UC-004**: Directorio no escribible, Path traversal attempt
- **UC-005**: Cancelación por usuario (Ctrl+C), Archivo parcial no creado
- **UC-006**: Usuario sin sesión activa, Cancelación durante descarga desde menú

### Reglas de Negocio
- **RB-001**: Scope `user-library-read` debe estar presente en token
- **RB-002**: Máximo 50 tracks por request (límite API Spotify)
- **RB-003**: Fecha y hora en nombre de archivo = fecha/hora inicio descarga (formato `YYYY-MM-DD_HH-mm-ss`)
- **RB-004**: `addedAt` preservado tal cual de API (ISO 8601 UTC)
- **RB-005**: Respetar `Retry-After` siempre (no asumir valor fijo)
- **RB-006**: Backoff exponencial con jitter (±10%) para evitar thundering herd
- **RB-007**: Contador de reintentos por request individual (no global)
- **RB-008**: Refresh automático transparente al usuario (sin prompt)
- **RB-009**: Nuevo refresh_token (si viene) debe persistirse
- **RB-010**: Tracks ya descargados en memoria se conservan durante refresh
- **RB-011**: La opción 3 solo está disponible después de conectar (tener tokens)
- **RB-012**: El flujo por menú interactivo es idéntico al flujo por comando
- **RB-013**: Después de completar, el menú vuelve a mostrarse para nuevas operaciones
- **RB-014**: La opción 0 sale de la aplicación
- **RB-015**: Validación de directorio de salida no escribible
- **RB-016**: Cancelación con Ctrl+C no deja archivo parcial
- **RB-017**: Archivo se guarda en `downloads/` por defecto; `outputDir` lo sobrescribe
- **RB-018**: Cada descarga registra en `data/app.log`: inicio, tracks obtenidos, completada/error

### Checklist de Validación
- [ ] Actores identificados
- [ ] Precondiciones claras
- [ ] Flujo principal completo
- [ ] Alternativas cubiertas
- [ ] Excepciones manejadas
- [ ] Postcondiciones verificables
- [ ] Reglas de negocio referenciadas

---

---

## Diagrama de Casos de Uso (Mermaid)

```mermaid
graph TD
    actor "Usuario Autenticado" as User
    package "spoty CLI" {
        usecase "UC-001: Descarga exitosa" as UC1
        usecase "UC-002: Manejo de Rate Limit" as UC2
        usecase "UC-003: Refresh de Token" as UC3
        usecase "UC-004: Directorio Personalizado" as UC4
        usecase "UC-005: Cancelación Usuario" as UC5
        usecase "UC-006: Opción Menú Interactivo" as UC6
    }
    
    User --> UC1
    User --> UC4
    User --> UC5
    
    UC1 .> UC2 : «include»
    UC1 .> UC3 : «include»
    UC4 .> UC1 : «extends»
```