# Arquitectura de OpenCode v3

## Principio central

Las políticas transversales pertenecen al nivel de proyecto. Los agentes definen responsabilidades específicas y no redefinen las políticas globales.

## Capas

```text
AGENTS.md
    ↓
Políticas transversales
    ↓
Reglas de fase
    ↓
Agentes especializados
    ↓
Skills bajo demanda
    ↓
Código / pruebas / documentación
```

## Flujo

```text
USUARIO
  ↓
SDD
  ↓
PLANIFICACIÓN DE FEATURE
  ↓
REVISIÓN DE ESPECIFICACIÓN
  ↓
APROBACIÓN HUMANA
  ↓
ARQUITECTURA
  ↓
PLANIFICACIÓN DE TAREAS
  ↓
TDD IMPLEMENTER
  ↓
DESCUBRIMIENTO
  ├── omisión ya implícita → replanning
  └── nuevo alcance → solicitud de cambio + aprobación
  ↓
REVISIÓN DE PRUEBAS
  ↓
VALIDACIÓN FINAL
  ↓
FEATURE_DONE
```

## Agentes

| Agente | Responsabilidad | Modelo principal |
|---|---|---|
| `sdd` | Orquestación y gates | Muse |
| `feature-planner` | Especificación funcional | Muse |
| `spec-reviewer` | Consistencia y trazabilidad | Muse |
| `architecture-agent` | Arquitectura y ADR | Muse |
| `change-analyzer` | Análisis de impacto | Muse |
| `task-planner` | Tareas y plan de pruebas | MiMo |
| `tdd-implementer` | RED → GREEN → REFACTOR | MiMo |
| `test-reviewer` | Revisión de pruebas | MiMo |
| `final-validator` | Cierre y evidencia | Muse |
| `skill-researcher` | Investigación de skills/librerías | Ling |
| `commit-agent` | Git y commit | Ling |

## Profundidad de subagentes

La configuración usa `subagent_depth: 1`. El agente primario `sdd` puede lanzar subagentes, pero esos subagentes no deben crear una segunda capa de subagentes.

Esta restricción reduce recursión, consumo innecesario de contexto y pérdida de control sobre el flujo.

## Fuente de verdad

Los documentos funcionales aprobados son fuente de verdad. Los siguientes documentos son de evidencia o gobierno y no sustituyen a la especificación:

- `SPEC_REVIEW.md`
- `DISCOVERIES.md`
- `CHANGE_REQUESTS.md`
- `TEST_REVIEW.md`
- `TDD_LOG.md`
- `VALIDATION.md`
- `STATE.md`

## Política de corrección

Un agente puede detectar un problema y proponer una corrección. No puede modificar silenciosamente un artefacto aprobado para eliminar una contradicción.
