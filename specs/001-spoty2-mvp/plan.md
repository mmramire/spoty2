## 1. Estructura de Módulos (N-Tier Architecture)

```
src/
├── presentation/           # Capa Presentation - CLI, prompts, consola
│   ├── cli.ts             # Entry point, parsing args, menú principal
│   ├── prompts.ts         # Prompts interactivos (readline nativo)
│   ├── console.ts         # Formateo salidas consola (colores, spinners)
│   └── messages.ts        # Strings usuario en español (centralizados)
│
├── business/              # Capa Business - Lógica pura, sin I/O
│   ├── auth/
│   │   ├── types.ts       # Tipos: AuthConfig, TokenSet, UserProfile, AuthResult
│   │   ├── config.ts      # Validación env vars + prompt fallback (RF-01)
│   │   ├── pkce.ts        # Generación code_verifier/challenge/state (RF-03)
│   │   ├── flow.ts        # Orquestación flujo OAuth completo (RF-02, RF-03, RF-04)
│   │   ├── tokens.ts      # Persistencia/lectura tokens + validación expiry (RF-05)
│   │   ├── profile.ts     # Obtención perfil usuario /v1/me (RF-06)
│   │   └── errors.ts      # Tipos de error de negocio diferenciados (RF-04, RF-06)
│   ├── retry.ts           # Política reintentos + backoff con Retry-After (RNF-08)
│   └── logger.ts          # Wrapper Pino para Business (RF-07)
│
└── data/                  # Capa Data - HTTP, FS, Logging real
    ├── http/
    │   ├── spotify-client.ts  # Wrapper @spotify/web-api-ts-sdk + fetch nativo
    │   └── token-exchange.ts  # POST /api/token con PKCE (RF-04)
    ├── storage/
    │   ├── tokens-file.ts     # Lectura/escritura data/tokens.json + chmod 0o600 (RF-05)
    │   └── log-file.ts        # Rotación/truncado data/app.log >5MB (RF-07)
    └── logging/
        └── pino-setup.ts      # Configuración Pino (pretty dev, JSON prod) (RF-07)
```

| Módulo | RFs Cubiertos |
|--------|---------------|
| `presentation/cli.ts` | RF-08 (menú), RF-01 (prompt env vars) |
| `presentation/prompts.ts` | RF-01 (validación interactiva), RF-08 (cancelación) |
| `business/auth/config.ts` | **RF-01** (carga/validación env vars + prompt) |
| `business/auth/pkce.ts` | **RF-03** (PKCE S256 generation) |
| `business/auth/flow.ts` | **RF-02, RF-03, RF-04** (orquestación completa) |
| `business/auth/tokens.ts` | **RF-05** (persistencia/validación tokens) |
| `business/auth/profile.ts` | **RF-06** (perfil usuario) |
| `business/auth/errors.ts` | **RF-04, RF-06** (errores 401 vs 403 diferenciados) |
| `business/retry.ts` | **RNF-08** (reintentos + Retry-After) |
| `data/http/token-exchange.ts` | **RF-04** (POST /api/token real) |
| `data/storage/tokens-file.ts` | **RF-05** (JSON + permisos 0o600) |
| `data/storage/log-file.ts` | **RF-07** (rotación logs >5MB) |
| `data/logging/pino-setup.ts` | **RF-07** (Pino configurado) |

---

## 2. Modelo de Datos JSON

### `data/tokens.json` (RF-05)

```json
{
  "access_token": "BQD...xYz",
  "refresh_token": "AQC...789",
  "expires_at": 1726843200000,
  "scope": "user-read-private user-read-email user-library-read user-library-modify playlist-read-private playlist-modify-private playlist-modify-public playlist-read-collaborative",
  "token_type": "Bearer"
}
```

| Campo | Tipo | Descripción | Validación |
|-------|------|-------------|------------|
| `access_token` | string | Token de acceso OAuth | No vacío, prefijo `BQ` típico |
| `refresh_token` | string | Token de refresco | No vacío |
| `expires_at` | number | Timestamp Unix **milisegundos** (now + expires_in) | > Date.now() = válido |
| `scope` | string | Scopes concedidos (space-separated) | Debe contener al menos `user-read-private user-read-email` |
| `token_type` | string | Tipo token (siempre "Bearer") | === "Bearer" |

### `data/app.log` (RF-07) — Formato Pino JSON lines

```json
{"level":30,"time":1726800000123,"pid":1234,"hostname":"host","msg":"Auth flow started","context":{"client_id":"abc...","redirect_uri":"http://127.0.0.1:8888/callback"}}
{"level":50,"time":1726800005456,"pid":1234,"hostname":"host","msg":"Token exchange failed","error":{"status":400,"message":"invalid_grant"},"context":{"step":"token_exchange"}}
```

---

## 3. Contrato de la CLI

### Comandos

| Comando | Descripción |
|---------|-------------|
| `spoty` | Menú principal interactivo (default) |
| `spoty connect` | Inicia flujo de conexión directo (skip menú) |
| `spoty status` | Muestra estado sesión actual (válida/expirada/ninguna) |
| `spoty logout` | Borra `data/tokens.json` y cierra sesión |
| `spoty --help` | Ayuda |

### Salidas (Consola) — Mensajes en español (RNF-06)

| Situación | Salida stdout | Código salida |
|-----------|---------------|---------------|
| **Éxito conexión** | `Conectado correctamente a Spotify como {display_name} ({email})` | `0` |
| **Sesión ya válida** | `Sesión activa: {display_name} ({email})` | `0` |
| **Sesión expirada** | `La sesión ha expirado. Iniciando nueva autenticación...` | `0` |
| **Cancelación usuario** | `Autorización cancelada por el usuario` | `0` |
| **Error transitorio (reintentando)** | `Error temporal: {descripción}. Reintentando ({n}/2)...` | — |
| **Error final (persistente)** | `Error al conectar con Spotify: {descripción}. Ver data/app.log para más información` | `1` |
| **Config inválida (env vars)** | `Falta SPOTIFY_CLIENT_ID. Obténlo en https://developer.spotify.com/dashboard` | `2` |
| **Redirect URI inválida** | `SPOTIFY_REDIRECT_URI debe usar http://127.0.0.1 (no localhost). Actualízala en el Dashboard.` | `2` |
| **Puerto ocupado** | `Puerto {puerto} en uso. Cierra la app que lo usa o cambia SPOTIFY_REDIRECT_URI.` | `3` |
| **Tokens corruptos** | `Sesión guardada inválida. Iniciando nueva autenticación...` | `0` |
| **Ayuda** | Uso + comandos + variables de entorno | `0` |

### Códigos de Salida

| Código | Significado |
|--------|-------------|
| `0` | Éxito (incluye cancelación voluntaria) |
| `1` | Error de autenticación/red no recuperable |
| `2` | Error de configuración (env vars faltantes/inválidas) |
| `3` | Error de recurso (puerto ocupado, FS) |
| `130` | Interrupción SIGINT (Ctrl+C) |

---

## 4. Decisiones Técnicas Justificadas

| # | Decisión | Justificación | Alternativa Descartada | Por qué no |
|---|----------|---------------|------------------------|------------|
| **1** | **PKCE S256 obligatorio** | Requerido por Spotify para apps públicas (SPA/CLI). Evita code interception. | Authorization Code clásico con `client_secret` | `client_secret` no puede guardarse seguro en binario distribuido. |
| **2** | **Redirect URI `http://127.0.0.1` (no `localhost`)** | rules.md + Spotify requirements: `localhost` no permitido en producción. | Permitir `http://localhost` | Fallaría validación Spotify en Dashboard. |
| **3** | **7 scopes pre-aprobados en MVP** | Evita re-consentimiento al usuario no técnico al añadir features futuras (library, playlists). | Solo 2 scopes mínimos (`user-read-private user-read-email`) | Violaría UX: usuario vería consent screen repetido. Documentado en spec. |
| **4** | **`@spotify/web-api-ts-sdk` (oficial)** | Tipado nativo TypeScript, mantenido por Spotify, compatible Angular futuro. | `spotify-web-api-node` (community) | Menos tipado, mantenimiento incierto, no oficial. |
| **5** | **Puerto configurable via `SPOTIFY_REDIRECT_URI`** | Usuario define en Dashboard; app extrae puerto dinámicamente. | Puerto fijo (8888) | Conflictos si puerto ocupado; menos flexible. |
| **6** | **Timeout callback 300s (5 min)** | Margen para 2FA, recovery password, usuarios lentos. | 120s (2 min) | Demasiado ajustado per feedback usuario. |
| **7** | **Rotación logs: truncar al iniciar si >5MB** | Sin dependencias extra (no `pino-rotation`). `node:fs` nativo. | `pino-rotation` / daily rotate file | Añade dependencia; constitución exige stack minimalista. |
| **8** | **Permisos `tokens.json`: `mode: 0o600`** | Cumple OWASP: solo owner read/write. Evita lectura por otros usuarios. | Sin permisos restrictivos (default 0o644) | Tokens expuestos a otros usuarios del sistema. |
| **9** | **Reintentos: leer header `Retry-After`** | rules.md exige respetar `Retry-After` en 429. Backoff = header + 1s. | Backoff exponencial fijo (1s, 2s, 4s) | Ignora indicación del servidor; puede reintentar muy pronto. |
| **10** | **Errores 401 vs 403 diferenciados** | 401 = token expirado (futuro refresh); 403 = OAuth inválido (re-login forzado). | Tratar todos 4xx igual | Pérdida de información accionable para usuario/sistema. |
| **11** | **Binario único: Node.js SEA** | Nativo Node v22+, sin deps externas, compatible Windows/Linux/macOS. | `@yao-pkg/pkg` / `nexe` | Deps extra, mantenimiento incierto, SEA es estándar futuro. |
| **12** | **Sin frameworks CLI (commander, yargs, inquirer)** | Constitución: stack minimalista. `readline` nativo + parsing manual args. | `commander` + `inquirer` | Añaden 2+ deps; funcionalidad simple no lo justifica. |
| **13** | **Business layer 100% puro (sin I/O)** | Constitución: reutilizable en Angular. Tests unitarios rápidos sin mocks HTTP/FS. | Mezclar lógica + I/O en services | Acopla Business a Node.js; impide reuso web. |

---

## 5. Estrategia de Tests (Vitest)

### Cobertura Objetivo: **≥ 80% en capa `business`** (constitución)

| Capa | Tipo Test | Herramienta | Qué se testa |
|------|-----------|-------------|--------------|
| **business/auth/config.ts** | Unit | Vitest | Validación env vars, prompt fallback, rechazo `localhost`, formato redirect URI |
| **business/auth/pkce.ts** | Unit | Vitest | `code_verifier` 43-128 chars, `code_challenge` S256 correcto, `state` criptográfico |
| **business/auth/flow.ts** | Unit | Vitest + MSW | Orquestación: éxito, cancelación (error=access_denied), error 400/401/403/429/500, timeout servidor |
| **business/auth/tokens.ts** | Unit | Vitest | Guardar/leer JSON, validación expiry, detección corrupto, permisos 0o600 (mock fs) |
| **business/auth/profile.ts** | Unit | Vitest + MSW | GET /v1/me éxito, 401 vs 403 diferenciado, parsing display_name/email |
| **business/auth/errors.ts** | Unit | Vitest | Mapeo códigos HTTP → tipos error negocio (Transient, Permanent, Cancelled, Config) |
| **business/retry.ts** | Unit | Vitest | Política: 2 reintentos max, backoff con `Retry-After`, no reintentar 4xx (excepto 429) |
| **data/http/token-exchange.ts** | Integration | Vitest + MSW | POST real a `/api/token` con PKCE, respuesta exitosa, error 400 |
| **data/storage/tokens-file.ts** | Integration | Vitest + tmp dir | Escritura/lectura real JSON, chmod 0o600 (Unix), atomic write (write + rename) |
| **data/storage/log-file.ts** | Integration | Vitest + tmp dir | Truncado al iniciar si >5MB, append logs |
| **presentation/cli.ts** | E2E (light) | Vitest + spawn | Happy path: `spoty connect` → éxito; `spoty status` → muestra sesión |

### Mocks / Stubs
- **HTTP**: [MSW (Mock Service Worker)](https://mswjs.io/) para interceptar `fetch` a `accounts.spotify.com` y `api.spotify.com`
- **FS**: `memfs` o `tmp` dir real para tests de persistencia
- **Time**: `vi.useFakeTimers()` para testear timeouts/expiry
- **Crypto**: `crypto.getRandomValues` mock para PKCE determinístico en tests

### Ejemplo Test Crítico (business/auth/flow.ts)

```typescript
// tests/business/auth/flow.test.ts
import { describe, it, expect, vi } from 'vitest'
import { runAuthFlow } from '@/business/auth/flow'
import { AuthErrorType } from '@/business/auth/errors'

describe('runAuthFlow', () => {
  it('returns user profile on successful auth (RF-02, RF-03, RF-04, RF-06)', async () => {
    // Setup MSW handlers: authorize → callback with code → token exchange → /v1/me
    const result = await runAuthFlow(validConfig)
    expect(result).toEqual({ display_name: 'Test User', email: 'test@example.com' })
  })

  it('returns CancelledError when user denies consent (RF-02, RF-05)', async () => {
    // MSW: callback returns ?error=access_denied
    await expect(runAuthFlow(validConfig)).rejects.toMatchObject({
      type: AuthErrorType.CANCELLED,
      message: 'Autorización cancelada por el usuario'
    })
  })

  it('retries twice on 429 then fails (RNF-08)', async () => {
    // MSW: 429 with Retry-After: 1 → 429 again → 500
    await expect(runAuthFlow(validConfig)).rejects.toMatchObject({
      type: AuthErrorType.TRANSIENT,
      retries: 2
    })
  })

  it('distinguishes 401 (expired) from 403 (invalid) on profile fetch (RF-06)', async () => {
    // MSW: token exchange OK, /v1/me returns 401
    await expect(runAuthFlow(validConfig)).rejects.toMatchObject({
      type: AuthErrorType.TOKEN_EXPIRED
    })
    // 403 → AuthErrorType.OAUTH_INVALID
  })
})
```

### Comando de Validación (DoD)
```bash
npx @biomejs/biome check --write .  # 0 errores
npx vitest run --coverage           # 100% tests pasan, coverage business ≥ 80%
```

---

## 6. Trazabilidad RF → Implementación

| RF | Módulo Principal | Test Clave |
|----|------------------|------------|
| RF-01 | `business/auth/config.ts` + `presentation/prompts.ts` | `config.test.ts` validación env + prompt |
| RF-02 | `business/auth/flow.ts` + `data/http/token-exchange.ts` | `flow.test.ts` servidor callback + intercambio |
| RF-03 | `business/auth/pkce.ts` + `business/auth/flow.ts` | `pkce.test.ts` generación S256 |
| RF-04 | `business/auth/flow.ts` + `data/http/token-exchange.ts` | `flow.test.ts` intercambio + errores 401/403 |
| RF-05 | `business/auth/tokens.ts` + `data/storage/tokens-file.ts` | `tokens-file.test.ts` persistencia + chmod |
| RF-06 | `business/auth/profile.ts` | `profile.test.ts` GET /v1/me + 401 vs 403 |
| RF-07 | `data/logging/pino-setup.ts` + `data/storage/log-file.ts` | `log-file.test.ts` truncado >5MB |
| RF-08 | `presentation/cli.ts` + `presentation/prompts.ts` | `cli.test.ts` menú + cancelación |
| RNF-08 | `business/retry.ts` | `retry.test.ts` Retry-After + backoff |

---

## 7. Próximos Pasos (Orden de Implementación)

1. ✅ **Setup proyecto**: `package.json` (deps: `@spotify/web-api-ts-sdk`, `pino`, `vitest`, `@biomejs/biome`), `tsconfig.json`, `biome.json`
2. ✅ **Capa Data**: `pino-setup.ts`, `log-file.ts`, `tokens-file.ts`, `spotify-client.ts`, `token-exchange.ts`
3. ✅ **Capa Business**: `types.ts`, `errors.ts`, `retry.ts`, `pkce.ts`, `config.ts`, `tokens.ts`, `profile.ts`, `flow.ts`
4. ✅ **Capa Presentation**: `messages.ts`, `console.ts`, `prompts.ts`, `cli.ts`
5. ✅ **Tests**: Unitarios Business → Integración Data → E2E light CLI
6. ✅ **Validación**: `biome check` + `vitest run` + build SEA (`node --experimental-sea-config`)

---

## 8. Checklist de Criterios de Finalización (Definition of Done)

La tarea se considera completada **solo cuando**:

1. ✅ Spec activa (`specs/001-spoty2-mvp/spec.md`) leída y entendida.
2. ✅ Implementación en capas N-Tier (`presentation`, `business`, `data`) con separación estricta.
3. ✅ `npx @biomejs/biome check --write .` pasa **sin errores ni warnings**.
4. ✅ `npx vitest run` ejecuta **100% de tests unitarios en verde** (cobertura ≥ 80% en `business`).
5. ✅ No hay alertas SonarLint pendientes reportadas por el usuario.
6. ✅ Binario compila y ejecuta en máquina limpia sin Node.js instalado (validación manual).
7. ✅ Flujo happy path verificado manualmente: variables de entorno → menú → navegador → autorización → callback → tokens guardados → mensaje éxito con nombre/email.
8. ✅ Flujos de error verificados: cancelación, puerto ocupado, env vars faltantes, JSON corrupto, red falla.
9. ✅ SonarLint issues resueltas (baseUrl deprecado, tipado crypto.getRandomValues).
    