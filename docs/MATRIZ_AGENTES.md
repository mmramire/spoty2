# Matriz de agentes

| Agente | Lee código | Edita docs | Edita código | Ejecuta comandos | Web | Skills | Subagentes |
|---|---:|---:|---:|---:|---:|---:|---:|
| `sdd` | Sí | Pregunta | Pregunta | Pregunta | Pregunta | Sí | Sí |
| `feature-planner` | Sí | Sí | No | No | Sí | Sí | No |
| `spec-reviewer` | Sí | Solo reporte | No | No | Pregunta | Sí | No |
| `architecture-agent` | Sí | Solo arquitectura/ADR | No | No | Sí | Sí | No |
| `change-analyzer` | Sí | Solo cambio/impacto | No | No | Sí | Sí | No |
| `task-planner` | Sí | Solo tareas/plan | No | No | Pregunta | Sí | No |
| `tdd-implementer` | Sí | Solo evidencia permitida | Sí | Pregunta | Sí | Sí | No |
| `test-reviewer` | Sí | Solo reporte | No | Pregunta | Pregunta | Sí | No |
| `final-validator` | Sí | Solo `VALIDATION.md` | No | Pregunta | No | Sí | No |
| `skill-researcher` | Sí | Solo con aprobación | No | No | Sí | Sí | No |
| `commit-agent` | Sí | No | No | Pregunta | No | No | No |

## Principio de permisos

Los permisos funcionan como una barrera técnica adicional al prompt.

La intención de un agente nunca debe ser suficiente para ampliar sus permisos fuera de su responsabilidad.
