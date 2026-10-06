# Casos de Uso: Descarga de Biblioteca de Canciones

## Actores
- **Usuario Autenticado**: Usuario que ya completó el flujo OAuth y tiene tokens válidos guardados
- **Sistema (spoty CLI)**: Aplicación que orquesta la descarga

---

## UC-001: Descarga exitosa de biblioteca completa

### Precondiciones
- Usuario tiene sesión válida (tokens en `data/tokens.json` no expirados)
- Usuario tiene al menos 1 track guardado en Spotify
- Conexión a internet disponible
- Espacio en disco suficiente (> 50MB para 3000 tracks)

### Flujo Principal
1. Usuario ejecuta `spoty download-songs` (o opción 4 en menú interactivo)
2. Sistema valida sesión existente (reutiliza `checkExistingSession()`)
3. Sistema obtiene access token válido (refresh si necesario)
4. Sistema inicia descarga paginada:
   - Request `GET /me/tracks?limit=50&offset=0`
   - Recibe página 1 (hasta 50 tracks con `addedAt`)
   - Si `next !== null`: request siguiente página con `offset += 50`
   - Repetir hasta `next === null`
5. Sistema transforma datos a estructura JSON de salida (SPECS.md §4)
6. Sistema genera nombre archivo: `YYYY-MM-DD-download_songs.json`
7. Sistema escribe archivo en directorio de trabajo (o `--output-dir`)
8. Sistema muestra mensaje éxito con ruta archivo y estadísticas
9. Sistema loggea `INFO` en `data/app.log` con resumen

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
- Archivo `YYYY-MM-DD-download_songs.json` existe y es JSON válido
- Contiene todos los tracks de la biblioteca al momento de descarga
- `metadata.totalTracks` == número real de tracks descargados
- Log en `data/app.log` registra operación exitosa
- Sesión OAuth intacta (tokens no modificados)

### Reglas de Negocio
- **RB-001**: Scope `user-library-read` debe estar presente en token
- **RB-002**: Máximo 50 tracks por request (límite API Spotify)
- **RB-003**: Fecha en nombre de archivo = fecha inicio descarga (no fin)
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

## Diagrama de Casos de Uso (Mermaid)

```mermaid
useCaseDiagram
    actor "Usuario Autenticado" as User
    package "spoty CLI" {
        usecase "UC-001: Descarga exitosa" as UC1
        usecase "UC-002: Rate Limit handling" as UC2
        usecase "UC-003: Token refresh" as UC3
        usecase "UC-004: Directorio personalizado" as UC4
        usecase "UC-005: Cancelación usuario" as UC5
    }
    
    User --> UC1
    User --> UC4
    User --> UC5
    
    UC1 .> UC2 : «include»\n(puede ocurrir durante)
    UC1 .> UC3 : «include»\n(puede ocurrir durante)
    UC4 .> UC1 : «extends»
    
    note right of UC1 : Flujo principal\ndescarga completa
    note right of UC2 : HTTP 429 +\nRetry-After + backoff
    note right of UC3 : HTTP 401 +\nrefresh token flow
    note right of UC4 : Flag --output-dir
    note right of UC5 : SIGINT (Ctrl+C)
```