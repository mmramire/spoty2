# Arquitectura: Descarga de Biblioteca de Canciones

## Decisiones Arquitectónicas (ADRs)

### ADR-001: Arquitectura N-Tier Pura (Presentation → Business → Data)
**Estado**: Aceptado  
**Contexto**: Agregar nueva funcionalidad `download-songs` al CLI existente  
**Decisión**: La capa Business NO debe contener lógica de CLI, ni imports de HTTP, ni manipulación de archivos. Todo el trabajo pesado (pagination, rate limits, JSON serialization, FS operations) queda en la capa Data. La capa Business expone una sola función `downloadSongs(options)` reutilizable por futuros clientes (web, API, etc.).  
**Consecuencias**: 
- +1 capa de abstracción inicial 
- -0 complejidad en Business (se mantiene limpia) 
- +Facilidad para tests unitarios con mocks puros
- -Levemente más archivos para navegar

**Alternativas consideradas y rechazadas**:
- *Lógica HTTP en Business*: Violaría la regla N-Tier y dificultaría tests
- *Estructura plana*: Perdería la separación de concerns y reutilización

---

### ADR-002: Manejo de Rate Limits con Backoff Exponencial + Retry-After
**Estado**: Aceptado  
**Contexto**: Spotify API impone límites estrictos en endpoints `/me/tracks` (máx 50 items/page, rate vars)  
**Decisión**: Implementar estrategia compuesta:
1. Respetar siempre la cabecera HTTP `Retry-After` (valor en segundos)
2. Aplicar backoff exponencial con jitter para reintentos subsiguientes: 2s, 4s, 8s, 16s... máximo 60s
3. Jitter aleatorio ±10% para evitar "thundering herd" si múltiples instancias fallan simultáneamente
4. Máximo 5 reintentos por request individual (no global)
5. Log WARN cada reintento con contador: "Retry X/5 después de Ys"

**Consecuencias**:
- +Alta tolerancia a fallos temporales de Spotify
- -Lógica más compleja (estado por request: retryCount, nextRetryAt)
- +Tests unitarios con reloj falso posibles (vitest advanceTimers)

**Alternativas consideradas y rechazadas**:
- *Fijo Retry-After solo*: No escala si Spotify aumenta límites o hay picos
- *Sin backoff*: Causaría bucle de fallos y bloqueo de la descarga

---

### ADR-003: Paginación "All or Nothing" Transaccional
**Estado**: Aceptado  
**Contexto**: Descargar 3000+ tracks en paginación de 50 items/page = 60 requests  
**Decisión**: No escribir archivo JSON parcial hasta tener TODOS los tracks acumulados en memoria (o stream con acumulación). Si falla en cualquier request (después de reintentos), NO se crea archivo de salida. Esto para evitar "archivos corruptos" o "descargas incompletas".  
**Consecuencias**:
- +Archivos siempre completos o ninguno (consistencia)
- -Memoria: acumular 3000 track objects en RAM (~50-80MB, dentro de RNF-002)
- +Código más simple (un solo writeFile al final)

**Alternativas consideradas y rechazadas**:
- *Write incremental cada N páginas*: Riesgo de archivo truncated si se corta energía; código más complejo con fs.createWriteStream + JSON stream

---

### ADR-004: Tokens y Seguridad - Nunca en Output ni Logs
**Estado**: Aceptado  
**Contexto**: Manejo de OAuth tokens en flujo CLI  
**Decisión**: 
- Tokens (`access_token`, `refresh_token`) MAYOR que nunca aparezcan en:
  - `console.log()` / salida CLI
  - `data/app.log` (Pino) 
  - Archivo JSON generado (`download_songs.json`)
- Sanitización activa: si un log capturase accidentalmente un objeto con token, se haría `redact` antes de escribir
- Tests explícitos que grepeen output por patrones `Bearer eyJ` o `refresh_token`

**Consecuencias**:
- +Cumplimiento rules.md #12 y constitution.md #8
- -Necesidad de funciones wrapper `safeLog()` y `redactToken()` en todo el código
- +Peace of mind para distribución a usuarios no técnicos

**Alternativas consideradas y rechazadas**:
- *Loguear tokens para debugging en producción*: Violación severa de TOS Spotify y políticas de seguridad

---

### ADR-005: Node.js ESM + TypeScript Strict Mode
**Estado**: Aceptado  
**Contexto**: Proyecto existente usa `"type": "module"` y tsconfig.json con configuraciones estrictas  
**Decisión**: Mantener consistencia con stack actual:
- `import`/`export` (sin require)
- `tsconfig.json`: `strict: true`, `noImplicitAny: true`, `skipLibCheck: true`
- Archivos .ts transpilados a .js en `dist/`
- Vitest como test runner (compatibilidad nativa con ESM)

**Consecuencias**:
- +Compatibilidad con Node.js 22+ features nativas
- -Curva de aprendizaje para desenvoltura en ESM si no está acostumbrado
- +Futuro-proof: Node.js 22+ es la dirección oficial

**Alternativas consideradas y rechazadas**:
- *CommonJS (`"type": "commonjs"`)*: Incompatibilidad con imports modernos del SDK `@spotify/web-api-ts-sdk`

---

## Diagrama de Componentes

```mermaid
componentDiagram
    attr CLI "Presentation Layer\n- src/presentation/\n- console.ts, prompts.ts\n- CLI args (--output-dir)"
    attr BUSINESS "Business Layer\n- src/business/\n- auth/ flow, types, errors\n- download-songs orchestrator"
    attr DATA "Data Layer\n- src/data/\n- http/ spotify-client.ts\n- storage/ tokens-file.ts\n- logging/ pino-setup.ts\n- Spotify API"
    attr FS "File System\n- data/tokens.json\n- *.json (output)\n- data/app.log"
    
    CLI --> BUSINESS : invoke download-songs()
    BUSINESS --> DATA : getValidToken(), fetchAllSavedTracks()
    DATA --> Spotify : GET /me/tracks?limit=50&offset=X
    DATA --> FS : writeFile(JSON), appendLog()
    DATA --> DATA : backoff exponential, pagination logic
    
    note for CLI "Sin lógica HTTP\nSolo orchestration"
    note for BUSINESS "Función pura:\ndownloadSongs(options)\nRetorna Track[] + metadata"
    note for DATA "100% reutilizable\npor cliente web futuro"
```

---

## Flujo de Datos Detallado

```mermaid
flowchart TD
    A[CLI: spoty download-songs] -->|parse args| B[Business: downloadSongs(options)]
    B -->|getValidAccessToken()| C[Data: getStoredTokens()]
    C -- token vencido? -->|refresh| D[Data: refreshAccessToken()]
    D -->|new tokens| C
    C -- OK --> E[Data: fetchAllSavedTracks(accessToken)]
    
    E -->|request page 1| F[Spotify API: GET /me/tracks?limit=50&offset=0]
    F -->|200 OK + items + next| G[Data: accumulate tracks]
    F -->|429 Rate Limit| H[Data: wait Retry-Afters + backoff]
    F -->|401 Token Expired| I[Data: refreshAccessToken() < retry request]
    
    G -->|next !== null| J[Data: request siguiente página offset+=50]
    G -->|next === null| K[Data: allTracks accumulated]
    
    K --> L[Business: transform to output JSON structure]
    L --> M[FS: writeFile(YYYY-MM-DD-download_songs.json)]
    M --> N[CLI: success message + file path]
    
    H -->|retry OK| F
    H -->|5 reintents fallados| O[Business: error rate limit]
    I -->|refresh OK| F
    I -->|refresh fallado| P[Business: error session expired, delete tokens]
    
    O --> Q[CLI: exit code 1 + mensaje]
    P --> R[CLI: exit code 2 + "reconectar"]
    Q --> R
```

---

## Estructura de Capas Detalle

### Presentation Layer (src/presentation/)
- `console.ts`: funciones de UI (spinner, error, messages en español)
- `prompts.ts`: entrada de usuario (prompt, confirm, menu choices)
- `messages.ts`: strings constantes i18n (español)
- CLI entry: `src/cli.ts` - main(), handleCommand(), parse args (`--output-dir`)

### Business Layer (src/business/)
- `auth/`: funciones existentes (checkExistingSession, runAuthFlow, getUserProfile, types, errors)
- **Nueva**: `downloadSongs.ts` - la única función exportada
  - `interface DownloadSongsOptions { outputDir?: string; force?: boolean }`
  - `async function downloadSongs(options: DownloadSongsOptions): Promise<DownloadResult>`
  - Retorna: `{ success: true, filePath, totalTracks }` o `{ success: false, error }`
  - **Regla estricta**: Sin `console.log`, sin `fs.writeFileSync`, sin imports HTTP
  - **Regla estricta**: Solo lógica de negocio (transformación, validación, orquestación)

### Data Layer (src/data/)
- **Existente**: `spotify-client.ts` - HTTP client puro (fetch, createAccessToken, exchangeCodeForTokens, refreshAccessToken, fetchUserProfile)
- **Existente**: `tokens-file.ts` - lectura/escritura `data/tokens.json` con permisos 0o600
- **Nueva**: `download-songs.service.ts` - orquestación de paginación, rate limits, backoff
  - `async function fetchAllSavedTracks(accessToken: string): Promise<TrackObject[]>`
  - Maneja todo el ciclo: request → response → rate limit → pagination → accumulate
  - **Regla**: Este es el "cerebro" de la descarga, 100% testable sin mocks de FS

---

## Endpoints y Scopes Mapeo

| Componente | Endpoint | Método | Scope | Documentación |
|------------|----------|--------|-------|---------------|
| `spotify-client.ts` | `/me/tracks` | GET | `user-library-read` | rules.md §5 + OpenAPI spec |
| `spotify-client.ts` | `/me/profile` | GET | `user-read-email` | Ya existe, reutilizado |
| Nueva funcionalidad | `/me/tracks` | GET | `user-library-read` | Nuevo endpoint para descarga |

**Nota**: El scope `user-library-read` debe solicitarse en el flujo OAuth. Revisar SPECS.md §5 para detalles de scopes en el flujo connect existente.

---

## Consideraciones de Performance y Memoria

### Cálculo de límite de páginas
Para N tracks en Spotify (máx 50 por página):
- Páginas totales = ceil(N / 50)
- Ejemplo: 3084 tracks → ceil(3084/50) = 62 páginas (61 × 50 + 1 × 34)

### Uso estimado de memoria
- Track object promedio: ~1.2KB (según estructura JSON en SPECS.md §4)
- 3084 tracks × 1.2KB ≈ 3.7MB solo tracks
- Acumulador array + metadata: < 10MB total
- Límite RNF-002: < 100MB pico ✅ Amplio margen

### Tiempo estimado (RNF-001)
- Latencia red típica: < 200ms por request
- 62 requests × 200ms = 12.4s (solo network)
- +Rate limits (promedio 1 cada 10 pages): +10 × 2s backoff = 20s
- +Procesamiento JSON + writeFile: +5s
- **Total estimado: ~20-30s** para 3000 tracks ✅ (meta < 60s)

---

## Trazabilidad a Tests

| Componente | Test File | Cobertura Mínima |
|------------|-----------|------------------|
| `downloadSongs()` (Business) | `tests/business/download-songs.test.ts` | 100% funciones expuestas |
| `fetchAllSavedTracks()` (Data) | `tests/data/download-songs.test.ts` | 100% pagination + rate limit + refresh |
| `spotify-client.ts` (HTTP) | `tests/data/http/spotify-client.test.ts` (ya existe) | 100% existente |
| Rate limit handler | `tests/business/retry/retry.test.ts` (ya existe) | 100% existente |
| Seguridad (tokens en logs) | `tests/security/tokens.test.ts` (nuevo) | 100% grepeo output |

---

## Lista de Checklist de Implementación

### Fase 1: Implementación (después de aprobar specs)
- [ ] Crear `src/business/download-songs.ts` - función `downloadSongs(options)`
- [ ] Crear `src/data/download-songs.service.ts` - `fetchAllSavedTracks(accessToken)`
- [ ] Crear `src/presentation/download-songs.prompts.ts` - mensajes UI específicos
- [ ] Agregar flag `--output-dir` / `-o` en `src/cli.ts`
- [ ] Agregar opción menú interactivo "5: Descargar biblioteca"

### Fase 2: Testing
- [ ] `npm run test` en verde en todos los tests nuevos
- [ ] Tests de integración con mock server (vitest + msw o nock)
- [ ] Tests de rate limit con reloj falso (vitest advanceTimers)
- [ ] Tests de token refresh simulation

### Fase 3: Calidad y Distribución
- [ ] `npx biome check --write .` sin errores
- [ ] `npm run lint` sin warnings
- [ ] `tsc --noEmit` sin errores (strict mode)
- [ ] Compilar: `npm run build` generar `dist/cli.js` ejecutable
- [ ] Considerar packaging a binario único (constitution.md #7: SEA/pkg)

### Fase 4: Documentación Final
- [ ] Este ARCHITECTURE.md actualizado con decisiones
- [ ] SPECS.md, REQUIREMENTS.md, USE_CASES.md, ACCEPTANCE_CRITERIA.feature en specs/002-download-songs/
- [ ] Readme actualizado o sección nueva en docs/
- [ ] Verificar que no haya `any` en TypeScript nuevo código

---

## Próximas Posibles Mejoras (Fuera de Alcance Actual)

1. **Descarga incremental**: track nuevos desde última fecha de descarga (usar `addedAt` comparación)
2. **Formato CSV/Excel**: para usuarios que no usan JSON
3. **Compresión gzip**: archivo `.json.gz` para reducir tamaño
4. **Filtros**: por artista, álbum, fecha rango durante la descarga
5. **Cloud sync**: subir backup a Dropbox/Google Drive automático (requeriría backend seguro por ADR-003 de credenciales expuestas)