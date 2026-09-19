# Resumen de Correcciones UX/UI - spoty2 MVP

## Problema Original
La salida de la CLI era visualmente poco amigable: todo compacto en una sola línea, logs de pino mezclados con la UI, spinner frágil, sin feedback de selección, y retorno al menú confuso.

---

## Fase 1: Separación de Logs y UI

### Archivo: `src/data/logging/pino-setup.ts`
- **Cambio**: Desactivar `pino-pretty` (stdout) en modo interactivo (TTY)
- **Detalle**: `isInteractive = process.stdin.isTTY && !process.argv.includes('--help') && !process.argv.includes('-h')`
- **Resultado**: Logs van solo a archivo (`data/app.log`) durante uso interactivo; `pino-pretty` redirigido a stderr (`destination: 2`) en modo no interactivo
- **No considerado en planificación**: Detección de modo interactivo via `stdin.isTTY` y argumentos de ayuda

---

## Fase 2: Estructura Visual y Componentes UI

### Archivo: `src/presentation/console.ts` - Nuevas funciones exportadas

| Función | Propósito | Uso |
|---------|-----------|-----|
| `section(title)` | Separador principal con título cyan/bold | Inicio de cada flujo |
| `divider()` | Línea horizontal dim `────────────────` | Separar secciones |
| `step(message)` | Paso numerado con `▶` azul | Acciones en progreso |
| `confirm(message)` | Confirmación verde con `✓` | Éxitos |
| `blank()` | Línea en blanco | Respiración visual |
| `bold(message)` | Texto en negrita | Títulos de menú/ayuda |
| `dim(message)` | Texto atenuado | Hints, timestamps |

### Spinner Robusto
- **Antes**: `\r` simple, se rompía con logs
- **Después**: `\r\x1b[K` (limpia línea completa) en cada frame
- **Nuevo**: Color cyan + tiempo transcurrido `MM:SS`
- **Nuevo**: `stopSpinnerWithError()` para errores limpios sin corromper línea

### Archivo: `src/cli.ts` - Aplicación sistemática
- Cada handler (`handleConnect`, `handleStatus`, `handleLogout`) envuelto en `section()`
- Pasos con `step()`, éxitos con `confirm()`, separadores con `divider()` + `blank()`
- Bienvenida solo al inicio (`runInteractiveMode`), no en cada iteración del menú
- Retorno al menú: `divider()` + `info('Volviendo al menú principal...')` + `blank()`

---

## Fase 3: Feedback de Selección y Pistas

### Archivo: `src/presentation/prompts.ts`
- `promptMenuChoice()`: muestra opción elegida tras Enter
  ```
  Selecciona una opción (1-4): 2  → Ver estado de conexión
  ```
- Mapeo interno `optionLabels` para labels descriptivos

### Archivo: `src/presentation/messages.ts`
- Agregado `menu.hint: '(navega con 1-4, Ctrl+C para cancelar)'`
- Agregado `auth.logoutConfirm` para confirmación destructiva

---

## Mejoras Adicionales (Post-Fases)

### 1. Confirmación para Acciones Destructivas (`handleLogout`)
```typescript
const confirmLogout = await prompt(MESSAGES.auth.logoutConfirm);
if (confirmLogout.toLowerCase() !== 's') {
  showMessage(info('Cancelado.'));
  return;
}
```
- Evita cierres accidentales de sesión
- No existía en planificación inicial

### 2. Ayuda Estructurada (`showHelp`)
```
=== spoty - Conexión a Spotify ===

Uso:
  spoty [comando]

Comandos:
  connect   Iniciar flujo de conexión...
  status    Ver estado...
  logout    Cerrar sesión...
  --help    Mostrar esta ayuda

Variables de entorno:
  SPOTIFY_CLIENT_ID     ...
  SPOTIFY_REDIRECT_URI  ...

Modo interactivo:
  Ejecuta "spoty" sin argumentos...
```
- Secciones con `bold()`, `section()`, líneas en blanco
- Documenta modo interactivo explícitamente

### 3. Manejo de Errores en Spinner (`handleConnect`)
```typescript
try {
  const { profile } = await runAuthFlow(config);
  stopSpinner(confirm(...));
} catch (err) {
  if (isCancelledError(err)) {
    stopSpinner(); // limpio, sin mensaje
    showMessage(MESSAGES.auth.cancelled);
  } else if (err instanceof AuthError) {
    stopSpinnerWithError(MESSAGES.errors.generic(err.message));
    throw err;
  }
}
```
- `stopSpinner()` limpio para cancelación (Ctrl+C)
- `stopSpinnerWithError()` para errores de auth
- No se consideraba caso de cancelación durante spinner

---

## Archivos Modificados

| Archivo | Tipo de Cambio |
|---------|----------------|
| `src/data/logging/pino-setup.ts` | Separación logs/UI |
| `src/presentation/console.ts` | Componentes UI + spinner robusto |
| `src/presentation/messages.ts` | Nuevos mensajes (hint, logoutConfirm) |
| `src/presentation/prompts.ts` | Feedback selección menú |
| `src/cli.ts` | Aplicación sistemática UI + mejoras UX |

---

## Verificación

```bash
npm run build    # ✓ Compila sin errores
npm test         # ✓ 81 tests pasan
npm run lint     # ✓ Sin errores biome
node dist/cli.js --help    # ✓ Ayuda estructurada
echo -e "2\n4" | node dist/cli.js 2>/dev/null  # ✓ Flujo status + retorno menú
echo -e "3\nn\n4" | node dist/cli.js 2>/dev/null  # ✓ Logout con confirmación cancelable
```

---

## Lecciones / No Considerado Inicialmente

1. **Detección de TTY** para separar logs solo en modo interactivo real
2. **Spinner con timestamp** para esperas largas (auth 5 min)
3. **Feedback visual de selección** (echo de opción elegida)
4. **Confirmación en acciones destructivas** (logout)
5. **Ayuda contextual** diferenciando CLI args vs modo interactivo
6. **Limpieza de spinner** diferenciando cancelación vs error
7. **Bienvenida única** vs repetida en cada loop del menú
8. **Estructura semántica** (section/divider/step/confirm) vs mensajes planos