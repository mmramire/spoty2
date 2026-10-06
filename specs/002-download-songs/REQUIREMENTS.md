# Requerimientos: Descarga de Biblioteca de Canciones

## Trazabilidad a Objetivos de Negocio

| ID Requerimiento | Objetivo de Negocio | Prioridad (MoSCoW) |
|-----------------|---------------------|-------------------|
| RF-001 | Usuario puede respaldar su biblioteca musical localmente | Must |
| RF-002 | Archivo incluye fecha de descarga para versionado/historial | Must |
| RF-003 | Formato JSON estructurado para procesamiento posterior | Must |
| RF-004 | Manejo robusto de rate limits de Spotify API | Must |
| RF-005 | Refresh automático de token durante descargas largas | Must |
| RF-006 | Progreso visible para bibliotecas grandes (3000+ tracks) | Should |
| RF-007 | Directorio de salida configurable | Could |
| RF-008 | Resumen estadístico al completar | Could |
| RNF-001 | Performance: < 60s para 3000 tracks (red normal) | Must |
| RNF-002 | Memoria: < 100MB pico durante descarga | Must |
| RNF-003 | Seguridad: Tokens nunca en logs ni output | Must |
| RNF-004 | Compatibilidad: Node.js 22+, Windows/Linux/macOS | Must |

---

## Requerimientos Funcionales (RF)

### RF-001: Descarga completa de Saved Tracks
**Descripción**: El sistema debe descargar todas las canciones guardadas en la biblioteca del usuario ("Me gusta") usando el endpoint `GET /me/tracks` con paginación.

**Criterios de validación**:
- Se obtienen TODAS las páginas hasta `next === null`
- Cada página solicita `limit=50` (máximo permitido)
- Se acumulan todos los tracks en un array único
- Se incluye el campo `addedAt` de cada `SavedTrackObject`

**Trazabilidad**: SPECS.md §4, §5

---

### RF-002: Nombre de archivo con prefijo de fecha ISO 8601
**Descripción**: El archivo de salida debe llamarse `YYYY-MM-DD-download_songs.json` donde la fecha corresponde a la fecha local del sistema al iniciar la descarga.

**Criterios de validación**:
- Formato exacto: `aaaa-mm-dd-download_songs.json` (ej: `2026-01-15-download_songs.json`)
- Fecha en zona horaria local del usuario
- Si archivo existe, sobrescribir (o opción `--force` para confirmar)

**Trazabilidad**: SPECS.md §1, §4

---

### RF-003: Estructura JSON de salida definida
**Descripción**: El archivo JSON debe seguir la estructura especificada en SPECS.md §4 con metadatos y array de tracks.

**Criterios de validación**:
- Objeto raíz con `metadata` y `tracks`
- `metadata`: `downloadedAt` (ISO 8601 UTC), `totalTracks` (number), `spotifyUserId`, `spotifyDisplayName`, `version`
- `tracks`: Array de objetos con `addedAt` y `track` (TrackObject completo)
- JSON válido, indentado (2 espacios), UTF-8

**Trazabilidad**: SPECS.md §4

---

### RF-004: Manejo de Rate Limits (HTTP 429)
**Descripción**: Al recibir HTTP 429, el sistema debe respetar la cabecera `Retry-After` (segundos) y aplicar backoff exponencial.

**Criterios de validación**:
- Primera espera: `Retry-After` segundos (mín 1s)
- Reintentos subsiguientes: backoff exponencial (2s, 4s, 8s... max 60s)
- Máximo 5 reintentos por request antes de fallar
- Log de cada reintento en `data/app.log` (level WARN)

**Trazabilidad**: SPECS.md §6, rules.md #10

---

### RF-005: Refresh automático de Access Token
**Descripción**: Si el access token expira durante la descarga (HTTP 401), el sistema debe usar el refresh token para obtener uno nuevo y continuar.

**Criterios de validación**:
- Detectar 401 en cualquier request de paginación
- Llamar a `refreshAccessToken(refreshToken)` 
- Reintentar el request fallido con nuevo token
- Si refresh falla (refresh token expirado), error claro: "Sesión expirada, vuelve a conectar"
- No perder tracks ya descargados

**Trazabilidad**: SPECS.md §6, rules.md #9

---

### RF-006: Indicador de progreso en consola
**Descripción**: Durante la descarga, mostrar progreso periódico en consola (cada N tracks o cada página).

**Criterios de validación**:
- Mensaje: "Descargados X de Y tracks..." (si se sabe total) o "Descargados X tracks..." (streaming)
- Actualización en misma línea (carriage return) o cada 100 tracks
- Al final: "¡Descarga completada! X tracks guardados en [ruta]"

**Trazabilidad**: SPECS.md §1, constitution.md #8

---

### RF-007: Directorio de salida configurable (Opcional)
**Descripción**: Permitir especificar directorio de salida vía flag CLI `--output-dir` o variable de entorno.

**Criterios de validación**:
- Default: directorio de trabajo actual (`process.cwd()`)
- Flag: `--output-dir <path>` o `-o <path>`
- Validar que directorio existe y es escribible
- Crear directorio si no existe (opcional `--create-dir`)

**Trazabilidad**: SPECS.md §1

---

### RF-008: Resumen estadístico al completar
**Descripción**: Mostrar resumen con: total tracks, artistas únicos, álbumes únicos, duración total, tamaño archivo.

**Criterios de validación**:
- Calcular en Business layer tras descarga
- Mostrar en consola al finalizar
- Incluir en logs (INFO)

**Trazabilidad**: SPECS.md §1

---

## Requerimientos No Funcionales (RNF)

### RNF-001: Performance - Tiempo de descarga
**Descripción**: Descargar 3000 tracks en < 60 segundos en conexión broadband típica (50 Mbps, latencia < 50ms).

**Métrica**: Tiempo wall-clock desde inicio hasta archivo escrito.

**Validación**: Test de integración con mock server simulando 3000 tracks (60 pages × 50).

---

### RNF-002: Uso de Memoria
**Descripción**: Pico de memoria < 100 MB durante descarga de 3000+ tracks.

**Estrategia**: 
- Streaming write (no acumular todo en memoria si es posible)
- O procesar por batches y escribir incrementalmente
- Usar `JSON.stringify` con replacer/stream si necesario

**Validación**: `process.memoryUsage().heapUsed` en test de carga.

---

### RNF-003: Seguridad - Protección de Tokens
**Descripción**: Ningún token (access, refresh) debe aparecer en logs, consola, ni archivo de salida.

**Validación**: 
- Grep en logs y output por patrones de token (Bearer, JWT)
- Code review de puntos de logging

---

### RNF-004: Compatibilidad Multiplataforma
**Descripción**: Funcionar en Windows 10+, Linux (glibc 2.31+), macOS 12+ con Node.js 22+.

**Validación**: CI/CD en GitHub Actions (ubuntu-latest, windows-latest, macos-latest).

---

### RNF-005: Código - Calidad y Estándares
**Descripción**: 
- TypeScript strict mode, sin `any`
- Biome check sin errores
- Complejidad cognitiva < 15 por función (Sonar)
- Cobertura tests ≥ 80% en Business layer

**Validación**: `npm run lint` y `npm run test` en CI.

---

## Matriz de Trazabilidad Resumen

| Req | SPECS | Caso de Uso | Criterio Aceptación | Test |
|-----|-------|-------------|---------------------|------|
| RF-001 | §4, §5 | UC-001 | AC-001, AC-002 | download-songs.test.ts |
| RF-002 | §1, §4 | UC-001 | AC-003 | download-songs.test.ts |
| RF-003 | §4 | UC-001 | AC-004 | download-songs.test.ts |
| RF-004 | §6 | UC-002 | AC-005 | rate-limit.test.ts |
| RF-005 | §6 | UC-003 | AC-006 | token-refresh.test.ts |
| RF-006 | §1 | UC-001 | AC-007 | download-songs.test.ts |
| RF-007 | §1 | UC-004 | AC-008 | cli-options.test.ts |
| RF-008 | §1 | UC-001 | AC-009 | download-songs.test.ts |
| RNF-001 | §6 | - | - | perf.test.ts |
| RNF-002 | §6 | - | - | perf.test.ts |
| RNF-003 | §8 | - | AC-010 | security.test.ts |
| RNF-004 | §6 | - | - | CI pipeline |
| RNF-005 | §6 | - | - | lint + test |