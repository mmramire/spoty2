# Trazabilidad: Creación de playlist vacía

| OBJ | RF/RNF | UC | AC | TASK | TC | CODE | VALIDATION |
|---|---|---|---|---|---|---|---|
| OBJ-001 | RF-001 | UC-001 | AC-001, AC-002, AC-003, AC-005 | Pendiente | Pendiente | Pendiente | Pendiente |
| OBJ-001 | RF-002 | UC-001 | AC-001, AC-004, AC-005 | Pendiente | Pendiente | Pendiente | Pendiente |
| OBJ-001 | RNF-001 | UC-001 | AC-004 | Pendiente | Pendiente | Pendiente | Pendiente |
| OBJ-001 | RNF-002 | UC-001 | AC-001, AC-002, AC-003, AC-004, AC-005 | Pendiente | Pendiente | Pendiente | Pendiente |
| OBJ-001 | RNF-003 | UC-001 | — (verificación posterior en arquitectura) | Pendiente | Pendiente | Pendiente | Pendiente |
| OBJ-001 | RNF-004 | UC-001 | — (verificación posterior en arquitectura) | Pendiente | Pendiente | Pendiente | Pendiente |
| OBJ-001 | RNF-005 | UC-001 | — (verificación posterior en implementación) | Pendiente | Pendiente | Pendiente | Pendiente |
| OBJ-001 | RNF-006 | UC-001 | AC-001, AC-004, AC-005 | Pendiente | Pendiente | Pendiente | Pendiente |

## Reglas

- No dejar requisitos huérfanos.
- No dejar criterios sin tarea o prueba cuando sean verificables mediante código.
- No considerar el código como evidencia suficiente sin un vínculo identificable.
- Actualizar esta matriz después de un cambio de alcance o una replanificación.

## Estado de esta matriz

- Versión 0.2.0 en estado DRAFT, sin `SPEC_READY` y sin aprobación para arquitectura, tareas ni implementación.
- Cadena `OBJ → RF/RNF → UC → AC` completa: RF-001 y RF-002 verificables; RNF-006 verificable; corrección O-001 aplicada con AC-005 en RF-001, RF-002, RNF-002 y RNF-006.
- Toda fila con `TASK`, `TC`, `CODE` o `VALIDATION` en `Pendiente` refleja la detención intencionada en fase de especificación: no se crean `ARCHITECTURE.md`, ADR, `TASKS.md`, `TEST_PLAN.md`, código ni pruebas.
- Los criterios AC-002 y AC-003 garantizan cobertura de los puntos de inicio validados (comando directo y menú); AC-001 cubre el resultado final; AC-004 y AC-005 cubren errores, validación y duplicados.
- No existen requisitos huérfanos ni criterios sin requisito o caso de uso relacionado.
