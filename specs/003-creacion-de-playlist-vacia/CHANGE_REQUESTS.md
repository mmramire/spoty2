# Solicitudes de cambio: 003-creacion-de-playlist-vacia

## Convención

Identificadores secuenciales `CR-001`, `CR-002`, etc. Este fichero es de ámbito de la feature `003-creacion-de-playlist-vacia` y su numeración es local a la feature, igual que en `DISCOVERIES.md`.

Toda solicitud clasificada como `SCOPE_CHANGE` exige análisis previo de `change-analyzer` y aprobación humana explícita antes de aplicarse (`AGENTS.md` §6 y §14: `NO CHANGE ANALYSIS → NO REPLAN`).

---

## CR-001: Re-acotar la medición de cobertura al alcance de la feature 003

- **Estado**: IMPLEMENTADO (replanificación 0.1.3 aplicada y ejecución completada el 2026-10-10: `coverage.include` re-acotado, TC-028 actualizado y cobertura verificada)
- **Origen**: `DISC-004`
- **Clasificación**: `SCOPE_CHANGE`
- **Análisis vinculante**: `change-analyzer`, sesión `ses_eda659a8fffe41u9Q81OIfhly8` (2026-10-10)
- **Motivo**: la validación externa de cobertura de RNF-005 da 71,9 % global frente al umbral del 80 %, por módulos de las features 001 y 002 ajenos a esta feature, mientras el alcance 003 está por encima del 80 %.
- **Cambio propuesto**: medir la cobertura solo sobre el alcance 003 (`src/business/playlists/**` + `src/business/retry/**`) en `vitest.config.ts`, conservando el umbral del 80 %.
- **Impacto**: `vitest.config.ts` (`coverage.include`), `TASKS.md` (TASK-020 §RNF-005), `TEST_PLAN.md` (TC-028, §10 y §12) y precisión de RNF-005 sin cambiar el umbral; ningún requisito, criterio ni ADR se modifica.
- **Aprobador**: aprobación humana explícita obtenida el 2026-10-10 a las 08:51 para la opción «Re-acotar medición a 003».
- **Fecha**: 2026-10-10

### Problema detectado

Con `@vitest/coverage-v8@5.0.3` instalado conforme al replan 0.1.2 de `DISC-003`, la validación externa `npx vitest run --coverage` termina en exit 1 con cobertura global de **71,9 %** (sentencias 71,86 %, ramas 72,64 %, funciones 79,51 %, líneas 71,72 %), por debajo del umbral del 80 % en las cuatro métricas. La causa raíz no está en la feature 003: el agregado `src/business/**` incluye módulos preexistentes de otras features — `src/business/download-songs.ts` (feature 002) al 0 % y `src/business/auth/flow.ts` (feature 001) al 8,97 % — que ninguna prueba de esta rama ejecuta (la única suite que los toca los sustituye con `vi.mock`). El alcance propio de la feature 003 alcanza `business/playlists` 97,76 % y `business/retry` 97,87 %.

### Opción aprobada

Re-acotar la medición de cobertura al alcance de la feature 003 — `src/business/playlists/**` + `src/business/retry/**` — en el `coverage.include` de `vitest.config.ts`, **manteniendo el umbral del 80 %** en las cuatro métricas (`lines`, `functions`, `branches`, `statements`).

### Opciones descartadas

| Opción | Decisión |
|---|---|
| Añadir pruebas nuevas de `auth/flow.ts` y `download-songs.ts` en esta rama | Descartada: incorporaría al alcance de la feature 003 comportamiento perteneciente a las features 001 y 002. |
| Relajar el umbral del 80 % | Descartada: el umbral aprobado se conserva sin ningún cambio. |

### Justificación

- Los módulos de las features 001 y 002 quedan fuera del alcance de esta feature conforme a la definición aprobada P-005 (sección «Fuera de alcance» de `SPECS.md`) y al principio de no inventar requisitos ni ampliar alcance en silencio.
- El alcance 003 se mantiene por encima del umbral en todas las métricas (97,76 % en `business/playlists` y 97,87 % en `business/retry`), de modo que el 80 % sigue siendo un criterio exigible y verificable sobre lo que a esta feature le corresponde medir.
- Es el mínimo cambio posible: no modifica requisitos, casos de uso, criterios de aceptación ni arquitectura, no relaja ningún umbral y no introduce dependencias.

### Artefactos que deben cambiar

- `vitest.config.ts`: `coverage.include` pasa de `['src/business/**/*.ts']` a `['src/business/playlists/**/*.ts', 'src/business/retry/**/*.ts']`; los cuatro umbrales en 80 permanecen intactos. **Aplicado.**
- `TASKS.md` 0.1.3: TASK-020 §RNF-005 precisa la cobertura mínima 80 % en el alcance 003 según `vitest.config.ts` re-acotado por `CR-001`; fila de replanificación `DISC-004`/`CR-001` añadida. **Aplicado.**
- `TEST_PLAN.md` 0.1.3: TC-028, §10 y §12 alineados con la medición re-acotada; ningún `TC-XXX` se renumera. **Aplicado.**
- `DISCOVERIES.md` § `DISC-004`: estado a «analizado + `CR-001` aprobada» y **cerrado** tras la ejecución del cambio. **Aplicado.**

### Impacto sin cambios

- `REQUIREMENTS.md` RNF-005: sin modificación de contenido; se precisa su verificación en plan y pruebas sin cambiar el umbral del 80 %.
- `SPECS.md`, `USE_CASES.md`, `ACCEPTANCE_CRITERIA.feature`, `ARCHITECTURE.md` y ADR: sin modificación.
- Código y pruebas reales: sin modificación en esta entrega de replanificación; TASK-001 a TASK-019 no se reabren y ningún gate se declara.

### Replanificación

Replanificación `0.1.3` aplicada exclusivamente sobre `TASKS.md` y `TEST_PLAN.md` (mismo criterio de mínimo cambio que los replans 0.1.1 y 0.1.2), más el registro del descubrimiento en `DISCOVERIES.md`. El ajuste de `coverage.include` en `vitest.config.ts` y la validación externa correspondiente (`npx vitest run --coverage`) se ejecutaron el 2026-10-10 como evidencia de TASK-020 / TC-028; el detalle queda en el addendum de cierre de `TDD_LOG.md`.

### Ejecución (2026-10-10)

Ejecución por TDD (`tdd-implementer`), en rama `feat/REQ-003-creacion-de-playlist-vacia` sobre base `482bd57`, sin commits:

- **RED**: aserción de TC-028 (`tests/transversal/verificacion-rnf.test.ts`) actualizada a los dos patrones del alcance 003; ejecución aislada → exit 1 por ausencia del comportamiento esperado.
- **GREEN**: `vitest.config.ts` con `include: ['src/business/playlists/**/*.ts', 'src/business/retry/**/*.ts']`; `provider: 'v8'`, `reporter` y los cuatro umbrales en 80 intactos; la misma ejecución aislada → exit 0 (20/20 en TC-028).
- **Validación externa**: `npx vitest run --coverage` → **exit 0** con sentencias 97,79 % (177/181), ramas 92,50 % (111/120), funciones 100 % (45/45) y líneas 97,76 % (175/179), por encima del umbral del 80 % sin relajarlo. Suite completa `npx vitest run` → exit 0 (30 ficheros, 295 pruebas); `npx tsc --noEmit` y `npx tsc -p tsconfig.type-tests.json --noEmit` → exit 0; `npx biome check` sobre los dos ficheros tocados → exit 0.
- **No vaciedad**: mutación temporal del `include` al agregado previo → exit 1 (TC-028 vuelve a fallar); reversión con hash idéntico → exit 0.
- Resultado: `CR-001` queda **IMPLEMENTADO** y `DISC-004` **cerrado**; TASK-020 puede cerrarse con su evidencia completa.

---

## CR-002: Confirmación final con resumen previo y pregunta explícita

- **Estado**: IMPLEMENTADO (ejecución TDD completada el 2026-10-10: suite 30 ficheros, 302 pruebas en verde; `tsc --noEmit` exit 0; `biome check` sin errores; `npm run build` exit 0)
- **Origen**: `DISC-006`
- **Clasificación**: `SCOPE_CHANGE` (altera literales de usuario aprobados, RNF-002)
- **Motivo**: la confirmación final mostraba solo `(s/N): ` sin indicar qué se confirma; el usuario confirmaba a ciegas.
- **Cambio aprobado**: anteponer a la petición el resumen `Resumen de la playlist: "X" (pública/privada, descripción: "...")` seguido de la pregunta `¿Crear la playlist con estos datos? ` conservando el formato `(s/N): ` y la regla de que solo `s` confirma (BR-007). El resumen usa únicamente datos ya aportados (nombre efectivo, visibilidad, descripción efectiva); sin resumen —visibilidad no resuelta, inalcanzable en el flujo real— se conserva el formato aprobado. El comando directo pre-resuelto y `duplicadoAceptado` siguen sin confirmación propia.
- **Impacto**: `src/presentation/messages.ts` (literales `summary` y `confirmPrompt`), `src/presentation/prompts.ts` (`ResumenCreacion`, `textoConfirmacion`, `confirmarCreacion(resumen?)`), `src/presentation/crear-playlist.ts` (`confirmacion(resumen?)`, `resumenDe`, canal por solicitud) y sus pruebas; ningún requisito, caso de uso ni arquitectura se modifica salvo los literales aquí fijados.
- **Aprobador**: aprobación humana explícita obtenida el 2026-10-10 para la opción «Fix 403 + mejora TUI».
- **Fecha**: 2026-10-10