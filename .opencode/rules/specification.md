# Regla de fase: especificación

La especificación define qué debe hacer el sistema y por qué.

## Artefactos

- `SPECS.md`: problema, objetivos, alcance, restricciones y comportamiento funcional.
- `REQUIREMENTS.md`: RF/RNF comprobables.
- `USE_CASES.md`: actores, disparadores, flujos y resultados.
- `ACCEPTANCE_CRITERIA.feature`: comportamiento verificable.
- `TRACEABILITY.md`: relaciones entre los artefactos.
- `STATE.md`: estado y gates.

## Reglas

- No comenzar arquitectura para resolver ambigüedades funcionales no resueltas.
- No comenzar implementación sin `SPEC_READY`.
- Mantener IDs estables cuando una actualización no requiera renumeración.
- No usar casillas de verificación de documentación como única evidencia de implementación.
- La evidencia de implementación vive en tests, código y `VALIDATION.md`.
