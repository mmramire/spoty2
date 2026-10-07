# OpenCode v3 — SDD + TDD

Esta carpeta contiene la configuración completa propuesta para la tercera iteración del flujo del proyecto.

## Objetivo

Separar las responsabilidades del sistema en agentes especializados, mantener una política transversal de idioma, aplicar TDD durante implementación, manejar descubrimientos y cambios de alcance sin perder trazabilidad, habilitar investigación web de librerías y skills, y cerrar una funcionalidad únicamente después de una validación final verificable.

## Qué reemplaza

La v3 sustituye la arquitectura anterior basada principalmente en:

- `.opencode/agent.md`
- `.opencode/agent/spec-driven.md`
- `.opencode/agent/spec-checker.md`
- `.opencode/agents/commit-agent.*`

La nueva estructura usa `.opencode/agents/` como ubicación principal de agentes y `.opencode/skills/` para capacidades reutilizables.

## Qué conserva

Se conservan como principios del proyecto los lineamientos detectados en la configuración previa:

- Node.js 22+.
- TypeScript estricto y ESM.
- Arquitectura Presentation → Business → Data.
- Biome.
- Vitest.
- Pino.
- seguridad de tokens y secretos.
- orientación a empaquetado futuro como ejecutable único.

Además se incorporan las decisiones acordadas durante la redefinición de la v3:

- idioma español como política transversal;
- trazabilidad OBJ → RF/RNF → UC → AC → TASK → TEST → CODE → VALIDATION;
- gates `SPEC_READY`, `IMPLEMENTATION_READY` y `FEATURE_DONE`;
- TDD RED → GREEN → REFACTOR;
- análisis de impacto para descubrimientos;
- aprobación humana para cambios de alcance;
- skills bajo demanda;
- investigación web de librerías y skills externas;
- modelo por responsabilidad y fallback centralizado.

## Instalación

1. Haz una copia de seguridad del `.opencode` actual.
2. Copia el contenido de esta carpeta en la raíz del proyecto.
3. Sustituye el `AGENTS.md` del proyecto solo después de revisar si existe información adicional específica que no estuviera presente en la configuración aportada para esta revisión.
4. Elimina los agentes antiguos que ya no correspondan, especialmente `.opencode/agent/` y la versión anterior de `commit-agent`.
5. Conserva las carpetas de `specs/` existentes; esta distribución no sobrescribe especificaciones históricas.
6. Inicia una nueva sesión de OpenCode.
7. Ejecuta `/models` y confirma que los modelos seleccionados para los agentes siguen disponibles.
8. Ejecuta `node scripts/opencode-v3-models.mjs verify`.

## Primer uso

Para revisar una especificación existente:

```text
/sdd-revisar specs/002-download-songs
```

Para iniciar una nueva funcionalidad:

```text
/sdd-iniciar 003-nombre-de-feature
```

Para generar tareas:

```text
/sdd-planificar 003-nombre-de-feature
```

Para implementar siguiendo TDD:

```text
/sdd-implementar 003-nombre-de-feature
```

Para analizar un descubrimiento durante implementación:

```text
/sdd-cambio 003-nombre-de-feature
```

Para validar al final:

```text
/sdd-validar 003-nombre-de-feature
```

Para investigar una skill o librería:

```text
/sdd-skill Playwright pruebas E2E
```

## Política de cambios

La implementación nunca modifica silenciosamente los requisitos aprobados.

Cuando se detecta una omisión o una nueva necesidad:

`DESCUBRIMIENTO → ANÁLISIS DE IMPACTO → REPLANIFICACIÓN`

Si la necesidad cambia el alcance:

`DESCUBRIMIENTO → SOLICITUD DE CAMBIO → APROBACIÓN HUMANA → ACTUALIZACIÓN DE ARTEFACTOS → REPLANIFICACIÓN`

## Política de skills

Las skills se almacenan en `.opencode/skills/<nombre>/SKILL.md` y se cargan bajo demanda mediante la herramienta nativa de skills de OpenCode.

No se incorporan skills externas automáticamente. Se investigan y evalúan antes de incorporarse.

## Política de modelos

Las asignaciones de modelos están separadas de la lógica de los agentes y documentadas en `.opencode/model-policy.json`.

Para cambiar un modelo por rol:

```text
node scripts/opencode-v3-models.mjs set coding opencode/otro-modelo
node scripts/opencode-v3-models.mjs sync
node scripts/opencode-v3-models.mjs verify
```

## Fuentes oficiales revisadas

- https://opencode.ai/docs/agents/
- https://opencode.ai/docs/skills/
- https://opencode.ai/docs/commands/
- https://opencode.ai/docs/rules/
- https://opencode.ai/docs/models/
- https://opencode.ai/docs/zen/
