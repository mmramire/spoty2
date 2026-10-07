---
name: change-impact
description: Determinar qué artefactos de una feature deben revisarse cuando aparece un descubrimiento o cambio durante implementación.
metadata:
  categoria: cambios
  idioma: español
---

# Análisis de impacto

## Cadena

`DISC → OBJ → RF/RNF → UC → AC → ARCH/ADR → TASK → TEST → CODE → VALIDATION`

## Procedimiento

1. localizar el elemento que originó el descubrimiento;
2. recorrer sus relaciones de trazabilidad;
3. marcar únicamente los artefactos afectados;
4. determinar si la necesidad ya estaba contenida en el alcance;
5. distinguir omisión de planificación de cambio real;
6. registrar evidencia y decisión.

## Regla

No usar impacto global como sustituto de análisis. Un cambio debe volver a los niveles previos solo hasta el punto necesario para mantener coherencia.
