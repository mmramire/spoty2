# OPTIMIZACIÓN DE TOKENS — OpenCode V3

## Objetivo

Reducir tokens de entrada y salida sin degradar trazabilidad, SDD, TDD ni capacidad de validación.

## Política

La optimización se aplica por capas:

```text
Contexto estable
   ↓
Skills bajo demanda
   ↓
Investigación delegada
   ↓
Lectura precisa de código
   ↓
Compactación
   ↓
Persistencia de estado
   ↓
Routing de modelos
   ↓
Prompt caching cuando el proveedor lo permita
```

## Reglas obligatorias

1. No cargar skills completas si no se necesitan.
2. No habilitar MCPs globalmente sin justificación.
3. No usar el modelo principal para tareas triviales cuando exista una alternativa más económica.
4. No devolver grandes resultados de investigación al orquestador.
5. No conservar salidas voluminosas de herramientas más tiempo del necesario.
6. Mantener compactación automática.
7. Persistir estado crítico en archivos de proyecto.
8. Delegar investigación externa a Scout/skill-researcher.
9. Preferir LSP y lecturas dirigidas frente a archivos completos.
10. Consultar documentación externa bajo demanda.
11. Mantener instrucciones estables para favorecer prompt caching.
12. Centralizar la selección de modelos y evitar hardcode distribuido.

## Contexto persistente mínimo

```text
STATE.md
TASKS.md
DISCOVERIES.md
specs/**
.opencode/model-policy.json
.opencode/skill-registry.md
skills-lock.json
```

## Presupuesto de contexto por rol

### Orquestador SDD

Debe recibir:
- solicitud actual;
- estado resumido;
- artefactos relevantes;
- resultados resumidos de subagentes.

No debe recibir:
- logs completos;
- documentación externa extensa;
- contenido de todas las skills;
- resultados brutos de búsquedas si ya existe un resumen verificable.

### Investigador / Scout

Puede consumir contexto externo mayor, pero debe retornar un informe comprimido:

```text
Conclusión
Evidencia
Riesgos
Decisiones pendientes
Referencias
```

### Implementador TDD

Debe recibir solo:
- tarea actual;
- requisitos/AC vinculados;
- arquitectura afectada;
- tests relevantes;
- fragmentos de código necesarios.

### Validador final

Debe recibir:
- mapa de trazabilidad;
- estado de tareas;
- pruebas ejecutadas;
- requisitos/AC;
- restricciones arquitectónicas.

## Model routing

La selección concreta de modelos debe residir en `.opencode/model-policy.json`.

La política debe expresar roles, no depender de un catálogo gratuito permanente.

Categorías recomendadas:

```text
reasoning-high
coding
fast
small
local-fallback
```

Los agentes referencian una decisión centralizada o se sincronizan desde esa política mediante script.

## small_model

Usar para tareas livianas cuando esté disponible.

No tratar `small_model` como cadena de fallback universal: su finalidad principal son operaciones ligeras.

## Prompt caching

Cuando el proveedor lo soporte:
- conservar prompts base estables;
- mantener AGENTS.md y prompts de agentes con orden estable;
- poner contenido dinámico al final;
- evitar timestamps o texto variable en prefijos estables;
- habilitar opciones específicas del proveedor solo si están documentadas.

## MCP

Antes de habilitar un MCP registrar:

```text
MCP:
Agentes autorizados:
Necesidad:
Herramientas expuestas:
Impacto de contexto:
Permisos:
Alternativa sin MCP:
Decisión:
```

Si WebSearch/WebFetch o una skill resuelven el caso con menos contexto, preferirlos.

## Métricas recomendadas

Registrar por sesión o feature cuando sea práctico:
- número de compactaciones;
- tamaño aproximado de contexto antes/después;
- cantidad de skills cargadas;
- cantidad de MCPs activos;
- investigaciones delegadas;
- modelo utilizado por agente;
- fallbacks ocurridos;
- reintentos por contexto excedido.

No convertir estas métricas en burocracia obligatoria para tareas pequeñas.
