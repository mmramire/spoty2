---
name: traceability
description: Mantener relaciones de trazabilidad entre requisitos, casos de uso, criterios, tareas, pruebas, código y validación.
metadata:
  categoria: gobierno
  idioma: español
---

# Trazabilidad

## Identificadores

`OBJ-XXX`, `RF-XXX`, `RNF-XXX`, `UC-XXX`, `AC-XXX`, `TASK-XXX`, `TC-XXX`, `DISC-XXX`, `CR-XXX`, `ADR-XXX`.

## Regla

Cada relación debe ser explícita cuando el artefacto la soporta.

## Matriz mínima

`REQ → UC → AC → TASK → TEST`

La relación hacia `CODE` se evidencia mediante archivos, símbolos o cambios concretos.

La relación hacia `VALIDATION` se evidencia mediante el reporte final.
