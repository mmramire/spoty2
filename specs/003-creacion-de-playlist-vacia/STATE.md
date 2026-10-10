# Estado de feature: creación de playlist vacía

- **Identificador**: 003-creacion-de-playlist-vacia
- **Estado**: DRAFT
- **Gate actual**: SPECIFICATION
- **Aprobación humana**: Pendiente
- **Descubrimientos pendientes**: 0
- **Solicitudes de cambio pendientes**: 0
- **Conflictos arquitectónicos pendientes**: 0
- **Preguntas abiertas**: 0

## Historial de gates

| Gate | Estado | Fecha | Evidencia |
|---|---|---|---|
| SPEC_READY | Pendiente | — | SPEC_REVIEW.md (versión 0.1.0 con FAIL; pendiente nueva revisión de la 0.2.0) |
| IMPLEMENTATION_READY | Pendiente | — | TASKS.md + TEST_PLAN.md |
| FEATURE_DONE | Pendiente | — | VALIDATION.md |

## Alcance inicial solicitado

- Feature `003-creacion-de-playlist-vacia`: permitir crear una playlist vacía desde el CLI spoty2.
- Definición aportada por el usuario: solo título + punto de entrada CLI. Convertida en especificación 0.1.0 y actualizada a 0.2.0 con definiciones humanas aprobadas P-001 a P-007 y cierre C-1 a C-6, manteniendo identificadores estables.
- No se inicia arquitectura, tareas ni implementación (orden SDD vigente).

## Artefactos de especificación (versión 0.2.0 del 2026-10-08)

- `SPECS.md`: actualizado a versión 0.2.0 con definiciones aprobadas P-001 a P-007, sin carácter bloqueante y con fuera de alcance según P-005.
- `REQUIREMENTS.md`: actualizado con RF-001, RF-002 y RNF-006 verificables y AC-005 incluido en matrices (corrección O-001).
- `USE_CASES.md`: actualizado con UC-001, disparadores validados de CLI y menú, flujo principal, alternativo A1 de duplicados y errores E1 a E3.
- `ACCEPTANCE_CRITERIA.feature`: actualizado con AC-001 a AC-005 ejecutables en español con Gherkin `Característica`, `Escenario`, `Dado`, `Cuando`, `Entonces`.
- `TRACEABILITY.md`: actualizada con cadena `OBJ → RF/RNF → UC → AC` completa y columnas `TASK`, `TC`, `CODE` y `VALIDATION` en pendiente.
- Este `STATE.md`: actualizado a versión 0.2.0, mantiene DRAFT hasta nueva revisión.
- No creados intencionadamente: `ARCHITECTURE.md`, ADR, `TASKS.md`, `TEST_PLAN.md`, código ni pruebas de implementación.

## Puntos de inicio validados

- CLI directo: `spoty create-new-playlist` con `--name` obligatorio, `--description` opcional y `--public | --private` obligatorios y excluyentes.
- Menú interactivo: opción `4. Crear playlist vacía` con ayuda `(navega con 0-4,9, Ctrl+C para cancelar)`.
- Cada flujo con interacción tiene su `Disparador / punto de inicio` concreto en USE_CASES.md y cobertura en ACCEPTANCE_CRITERIA.feature: verificado en UC-001, AC-002 y AC-003 como definiciones aprobadas.

## Definiciones aprobadas incorporadas

- P-001 (CLI directo): comando único, nombre 3-100 visibles tras recorte, mensajes y ejemplos aprobados, descripción por defecto, visibilidad obligatoria excluyente, colaborativa fuera.
- P-002 (menú): opción 4, ayuda, peticiones, visibilidad con pública preseleccionada, confirmación `(s/N): ` y aborto con `Ctrl+C`.
- P-003 (autenticación y servicio): sesión vía opción 1, ámbitos ya incluidos, mensajes 401/403/429/genérico, hasta 3 reintentos con `Retry-After` verificado o 10 segundos.
- P-004 (validación y duplicados): vacío, rige Spotify, duplicados solo propias con regla exacta, advertencia, menú de tres opciones y registro de advertencia.
- P-005 (fuera de alcance): canciones, portada, interfaz gráfica, reproducción, sincronización, colaborativa, persistencia salvo `data/app.log`, cuotas salvo 429 con 3 reintentos, sin parámetros ocultos.
- P-006 (éxito): mensaje único con identificador y enlace en CLI y menú.
- P-007 (registro): Pino en `data/app.log` sin tokens, con eventos `info`, `warn` y `error` definidos; canceladas sin registro.
- Cierre C-1 a C-6: confirmación de alcance y detención incorporada; sin arquitectura, sin tareas, sin pruebas, sin código, sin declaración de `SPEC_READY` y con estado DRAFT hasta nueva revisión.

## Actuación de planificación

- Orquestador SDD paso 1 completado: feature identificada como `003-creacion-de-playlist-vacia` con alcance inicial mínimo y entrada CLI.
- Versión 0.1.0 del 2026-10-07 creada como borrador con 7 preguntas bloqueantes; revisión `SPEC_REVIEW.md` con FAIL y observación O-001.
- Actuación del 2026-10-08: actualización a versión 0.2.0 usando exclusivamente los archivos `.template` de `.opencode/templates/` como referencia de estructura. No se usan como plantillas `.opencode/templates/STATE.md`, `.opencode/templates/TASKS.md` ni `.opencode/templates/DISCOVERIES.md` por ser de migración V2 → V3. No se crean `ARCHITECTURE.md`, ADR, `TASKS.md`, `TEST_PLAN.md`, código ni pruebas. No se inventa comportamiento fuera de P-001 a P-007.
- Resultado: especificación con definiciones aprobadas, sin preguntas abiertas, lista para nueva revisión. Estado DRAFT. No se declara `SPEC_READY`. No se avanza a arquitectura.

## Preguntas abiertas

No quedan preguntas abiertas (0). Las 7 preguntas P-001 a P-007 quedan cerradas.

## Supuestos explícitos

- La carpeta `specs/003-creacion-de-playlist-vacia/` contiene `STATE.md` vivo más los cinco artefactos en versión 0.2.0; no existe aprobación para arquitectura ni implementación.
- Los puntos de inicio de CLI y menú son definiciones validadas según P-001 y P-002.
- Los ámbitos exigidos ya existen en `REQUIRED_SCOPES`; la política de 429 respeta `Retry-After` verificado en documentación oficial o 10 segundos en su ausencia.
- Se conservan identificadores estables OBJ-001, RF-001, RF-002, RNF-001 a RNF-006, UC-001 y AC-001 a AC-005, sin renumeración.
- Se conserva arquitectura en capas `Presentation → Business → Data`, español estricto, trazabilidad `OBJ → RF/RNF → UC → AC → TASK → TEST → CODE → VALIDATION` y compatibilidad futura con binario único vía Node.js SEA.
- No existe `SPEC_READY` ni aprobación para arquitectura, tareas o implementación.

## Próxima acción

- Solicitar nueva revisión a `spec-reviewer` sobre la versión 0.2.0 y, solo con resultado aprobatorio más aprobación humana explícita, declarar `SPEC_READY`. No iniciar arquitectura, tareas ni implementación hasta entonces.
