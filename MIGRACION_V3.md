# MIGRACIÓN V3 — OpenCode

## 1. Propósito

Este documento define una migración controlada de infraestructura OpenCode v2 → v3.

No es una especificación funcional y no autoriza cambios de producto.

Objetivos:
- retirar únicamente componentes obsoletos de v2;
- instalar y verificar la estructura v3;
- conservar las especificaciones históricas existentes;
- preservar reglas específicas del proyecto;
- validar la configuración antes de iniciar una nueva especificación;
- dejar evidencia reproducible de la migración;
- incorporar optimizaciones de contexto y consumo de tokens sin alterar funcionalidad.

## 2. Principios de seguridad

### 2.1 No borrar por coincidencia de nombre

Un archivo no debe eliminarse solo porque su nombre coincida con uno de v2.

La versión se determina por:
1. ubicación;
2. contenido;
3. referencias desde la configuración v3;
4. pertenencia al inventario v3.

Ejemplos:
- `.opencode/agents/commit-agent.md` v3 → **CONSERVAR**;
- un `commit-agent.md` antiguo fuera de la estructura v3 → retirar solo si se confirma que pertenece a v2.

### 2.2 No cambiar producto durante la migración

La migración no debe:
- cambiar funcionalidades;
- reinterpretar requisitos;
- modificar código de producción;
- introducir decisiones arquitectónicas de producto;
- reescribir especificaciones históricas para adaptarlas a la nueva infraestructura.

Todo hallazgo que exceda este alcance debe registrarse como descubrimiento o solicitud de cambio.

## 3. Inventario objetivo V3

La estructura mínima esperada es:

```text
AGENTS.md
opencode.json
skills-lock.json

.opencode/
├── agents/
├── commands/
├── rules/
├── skills/
├── templates/
├── model-policy.json
├── model-policy.md
└── skill-registry.md

.agents/
scripts/
specs/
```

> Nota: `skills-lock.json` está en la raíz del proyecto. No debe verificarse como `.opencode/skills-lock.json`.

## 4. Componentes V2 a retirar

Retirar únicamente si se verifica que pertenecen efectivamente a v2:

- `.opencode/agent.md`;
- `.opencode/agent/`;
- `commit-agent.json` antiguo;
- cualquier `commit-agent.md` antiguo fuera de la estructura v3;
- definiciones antiguas dentro de `.opencode/agents/` solo después de confirmar que no forman parte de v3.

**Nunca eliminar `.opencode/agents/commit-agent.md` si es la versión v3.**

## 5. Verificación de estructura V3

Verificar de forma literal las siguientes rutas:

```text
AGENTS.md
opencode.json
skills-lock.json
.opencode/agents/
.opencode/commands/
.opencode/rules/
.opencode/skills/
.opencode/templates/
.opencode/model-policy.json
.opencode/model-policy.md
.opencode/skill-registry.md
.agents/
scripts/
specs/
```

No usar rutas abreviadas como `agents/` o `commands/`, porque podrían validar una carpeta incorrecta.

## 6. Verificación de scripts

Scripts existentes verificados en `scripts/`:

```text
SCRIPT-001 → scripts/opencode-v3-models.mjs
SCRIPT-002 → scripts/opencode-v3-validate.mjs
```

Para cada script registrar:

```text
ID:
Ruta:
Propósito:
Entradas:
Salidas:
Modo de ejecución:
Resultado:
Código de salida:
Observaciones:
```

No es suficiente comprobar que `scripts/` exista.

Si se agregan scripts posteriormente, deben recibir un nuevo identificador `SCRIPT-XXX`.

## 7. Revisión de AGENTS.md

Antes de finalizar la migración:
1. comparar el `AGENTS.md` histórico con el v3;
2. identificar reglas específicas del proyecto;
3. conservar las reglas todavía válidas;
4. eliminar solo contradicciones explícitamente resueltas;
5. verificar las políticas transversales v3.

Como mínimo deben comprobarse:
- español estricto para documentación y textos explicativos;
- SDD;
- TDD durante implementación;
- trazabilidad;
- gestión de cambios;
- arquitectura y ADRs;
- validación final;
- seguridad y permisos;
- Definition of Done;
- política de skills;
- política de modelos;
- política de optimización de contexto y tokens.

## 8. Especificaciones históricas y especificaciones activas

Durante esta migración, las especificaciones existentes que deben preservarse y revisarse son:

```text
SPEC-001 → specs/001-spoty2-mvp/
SPEC-002 → specs/002-download-songs/
```

Estas son las **especificaciones activas para revisión de migración**.

La migración no debe modificar su comportamiento funcional.

Antes de iniciar una nueva especificación comprobar:
- idioma;
- estructura;
- consistencia documental;
- compatibilidad con convenciones v3;
- trazabilidad existente cuando corresponda;
- ausencia de cambios funcionales introducidos por la migración.

### 8.1 Spec 003

Actualmente no se asume que exista una `Spec 003`.

El directorio esperado `specs/003-*` solo se creará cuando una nueva solicitud funcional haya pasado por el flujo normal de planificación.

Por lo tanto, el objetivo de la migración es dejar el proyecto **preparado para la próxima especificación**, no crear ni inferir una Spec 003 inexistente.

## 9. Persistencia de estado y trazabilidad

La evidencia de migración debe persistir fuera del contexto conversacional.

Archivos recomendados:

```text
STATE.md
DISCOVERIES.md
TASKS.md
```

Las plantillas correspondientes deben residir en:

```text
.opencode/templates/STATE.md
.opencode/templates/DISCOVERIES.md
.opencode/templates/TASKS.md
```

### 9.1 Identificadores

```text
DISC-XXX → descubrimiento real
CR-XXX   → solicitud de cambio
TASK-XXX → tarea ejecutable
```

No reutilizar identificadores.

Los ejemplos de este documento se marcan expresamente como ilustrativos y no consumen numeración real.

### 9.2 Flujo de un descubrimiento

```text
Hallazgo
  ↓
DISC-XXX
  ↓
Análisis de impacto
  ├─ sin impacto funcional → TASK-XXX
  └─ afecta alcance/requisitos/arquitectura → CR-XXX
                                          ↓
                                  aprobación humana
                                          ↓
                                actualización controlada
```

### 9.3 Aprobaciones

- Un `DISC-XXX` puede ser registrado por el agente que detecta el problema.
- Un `TASK-XXX` puramente técnico de migración puede ejecutarse dentro del alcance aprobado.
- Un `CR-XXX` que cambie alcance, requisitos, comportamiento o arquitectura requiere aprobación humana antes de ejecutarse.
- Ningún agente debe cambiar silenciosamente una especificación aprobada.

## 10. Optimización de contexto y tokens

La migración debe dejar activadas o documentadas las siguientes optimizaciones:

### 10.1 Compactación automática

Requerido:

```text
compaction.auto = true
```

Objetivo: evitar que sesiones extensas acumulen indefinidamente contexto histórico.

### 10.2 Poda de salidas antiguas

Cuando la versión instalada de OpenCode soporte la opción activa:

```text
compaction.prune = true
```

Si la versión instalada utiliza el esquema alternativo de compactación, aplicar el equivalente soportado y registrar la decisión.

### 10.3 Estado persistente

Información que no debe depender exclusivamente de la conversación:
- estado de gates;
- tareas pendientes;
- descubrimientos;
- solicitudes de cambio;
- trazabilidad;
- decisiones aprobadas;
- último punto seguro de reanudación.

Debe persistirse en `STATE.md`, `TASKS.md`, `DISCOVERIES.md` y artefactos SDD correspondientes.

### 10.4 Skills bajo demanda

Las skills deben cargarse solo cuando sean necesarias.

No copiar el contenido completo de todas las skills dentro de los prompts de los agentes.

Usar descripciones breves y específicas para facilitar descubrimiento selectivo.

### 10.5 Investigación delegada

La investigación externa debe delegarse a un agente de investigación/Scout cuando sea posible.

El resultado devuelto al orquestador debe ser resumido e incluir solo:
- conclusión;
- evidencia necesaria;
- decisiones pendientes;
- referencias útiles.

No devolver grandes volcados de páginas o documentación.

### 10.6 Navegación precisa de código

Preferir LSP, búsqueda dirigida y lectura por rangos frente a cargar archivos completos cuando no sea necesario.

### 10.7 Web y documentación externa

Flujo recomendado:

```text
WebSearch → seleccionar fuentes → WebFetch/Context7 → resumen → agente consumidor
```

No cargar documentación externa completa en el contexto principal.

### 10.8 MCP selectivo

No habilitar MCPs globalmente por comodidad.

Cada MCP debe:
- justificar su utilidad;
- asignarse solo a agentes que lo necesiten;
- tener permisos mínimos;
- ser revisado por impacto de contexto.

### 10.9 Modelo pequeño

Cuando haya un modelo más económico disponible, usar `small_model` o el mecanismo equivalente de la versión instalada para tareas livianas.

No utilizar el modelo principal para títulos, resúmenes triviales u operaciones mecánicas si no es necesario.

### 10.10 Enrutamiento por agente

La política de modelos debe permanecer centralizada.

No duplicar nombres de modelos en múltiples archivos sin necesidad.

Matriz conceptual:

```text
sdd/orquestador          → razonamiento, herramientas mínimas
feature-planner          → razonamiento + lectura/búsqueda
spec-reviewer            → razonamiento + lectura
architecture-agent       → razonamiento + skills/documentación
skill-researcher         → rápido + web/scout/skills
tdd-implementer          → coding + edit/bash/LSP/skills
test-reviewer            → rápido/coding + tests/LSP
final-validator          → razonamiento + lectura/bash/tests
commit-agent             → modelo pequeño + git
```

### 10.11 Prompt caching

Cuando se utilice un proveedor pago con prompt caching:
- mantener estables los prefijos de sistema/agente;
- evitar regenerar instrucciones equivalentes con redacción distinta;
- colocar contenido dinámico después del bloque estable;
- revisar opciones de caché específicas del proveedor.

No asumir que todos los proveedores implementan la caché de la misma manera.

## 11. Gates de migración

Los gates son controles locales de esta migración. **No crean nuevos estados globales del ciclo SDD.**

Su resultado se persiste en `STATE.md` con uno de estos valores locales:

```text
PENDIENTE
APROBADO
BLOQUEADO
```

### MIGRATION_GATE_1 — Limpieza

```text
[ ] Componentes v2 identificados por ubicación y contenido
[ ] Componentes v2 obsoletos retirados
[ ] Ningún componente v3 eliminado accidentalmente
[ ] .opencode/agents/commit-agent.md v3 conservado
```

Resultado local: `PENDIENTE | APROBADO | BLOQUEADO`

### MIGRATION_GATE_2 — Estructura

```text
[ ] AGENTS.md
[ ] opencode.json
[ ] skills-lock.json
[ ] .opencode/agents/
[ ] .opencode/commands/
[ ] .opencode/rules/
[ ] .opencode/skills/
[ ] .opencode/templates/
[ ] .opencode/model-policy.json
[ ] .opencode/model-policy.md
[ ] .opencode/skill-registry.md
[ ] .agents/
[ ] scripts/
[ ] specs/
```

Resultado local: `PENDIENTE | APROBADO | BLOQUEADO`

### MIGRATION_GATE_3 — Integridad verificable

```text
[ ] AGENTS.md histórico revisado
[ ] Reglas específicas preservadas
[ ] specs/001-spoty2-mvp/ conservada
[ ] specs/002-download-songs/ conservada
[ ] scripts/opencode-v3-models.mjs verificado
[ ] scripts/opencode-v3-validate.mjs verificado
[ ] opencode.json parsea correctamente
[ ] model-policy.json parsea correctamente
[ ] No existen IDs de agentes duplicados en ubicaciones activas
[ ] Cada skill registrada existe físicamente
[ ] Cada skill bloqueada/registrada coincide con skills-lock.json
[ ] No existen IDs de skills duplicados salvo override intencional documentado
```

Método mínimo de verificación:
1. ejecutar el validador v3 disponible;
2. validar JSON mediante parser, no por inspección visual;
3. enumerar agentes activos y detectar IDs duplicados;
4. enumerar skills físicas;
5. comparar skills físicas con `.opencode/skill-registry.md` y `skills-lock.json`;
6. registrar cualquier excepción intencional.

Resultado local: `PENDIENTE | APROBADO | BLOQUEADO`

### MIGRATION_GATE_4 — Preparación para próxima especificación

```text
[ ] specs/001-spoty2-mvp/ revisada
[ ] specs/002-download-songs/ revisada
[ ] Convenciones de idioma verificadas
[ ] Convenciones de trazabilidad verificadas
[ ] Configuración v3 validada
[ ] Optimización de contexto/tokens documentada y aplicada donde corresponda
[ ] STATE.md actualizado
[ ] DISCOVERIES.md actualizado
[ ] TASKS.md actualizado
[ ] No existen bloqueos conocidos
```

Resultado local: `PENDIENTE | APROBADO | BLOQUEADO`

## 12. Criterio final

La migración se considera completada cuando los cuatro gates están `APROBADO`.

```text
MIGRATION_GATE_1 = APROBADO
        ↓
MIGRATION_GATE_2 = APROBADO
        ↓
MIGRATION_GATE_3 = APROBADO
        ↓
MIGRATION_GATE_4 = APROBADO
        ↓
MIGRACIÓN V3 COMPLETADA
        ↓
Puede iniciarse la próxima especificación mediante el flujo SDD normal
```

## 13. Ejemplo ilustrativo de trazabilidad

> **EJEMPLO ILUSTRATIVO — NO REGISTRAR ESTE ID COMO REAL**

```text
DISC-EJEMPLO-001

Descripción:
La documentación clasificaba commit-agent.md de forma ambigua.

Impacto:
Podía provocar el borrado accidental del agente v3.

Acción:
Distinguir explícitamente la ubicación y versión v2/v3.
```

## 14. Plantilla de estado

```text
Estado de migración: __________________

MIGRATION_GATE_1: PENDIENTE | APROBADO | BLOQUEADO
MIGRATION_GATE_2: PENDIENTE | APROBADO | BLOQUEADO
MIGRATION_GATE_3: PENDIENTE | APROBADO | BLOQUEADO
MIGRATION_GATE_4: PENDIENTE | APROBADO | BLOQUEADO

Descubrimientos registrados:
- DISC-___

Solicitudes de cambio:
- CR-___

Tareas de migración:
- TASK-___

Bloqueos:
- ____________________________________

Último punto seguro de reanudación:
- ____________________________________

Observaciones:
- ____________________________________

Fecha:
- ____________________________________
```

## 15. Principio final

La migración es infraestructura del proceso SDD.

No debe utilizarse para cambiar funcionalidades, reinterpretar requisitos, eliminar especificaciones históricas, introducir decisiones arquitectónicas de producto ni modificar código de producción.

Cualquier necesidad fuera de este alcance debe registrarse y seguir el flujo formal de descubrimiento, análisis de impacto, cambio y aprobación humana cuando corresponda.
