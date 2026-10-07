# Regla de fase: validación

La validación final debe ser basada en evidencia, no en declaraciones del agente.

## Fuentes de evidencia

- código;
- tests;
- salida de herramientas de calidad;
- criterios Gherkin ejecutados o pruebas equivalentes;
- `TDD_LOG.md`;
- `TEST_REVIEW.md`;
- `SPEC_REVIEW.md`;
- `TRACEABILITY.md`;
- `DISCOVERIES.md`;
- `CHANGE_REQUESTS.md`;
- `ARCHITECTURE.md` y ADR.

## Condiciones de cierre

No declarar `FEATURE_DONE` si existe:

- requisito sin cobertura;
- criterio sin evidencia;
- tarea pendiente;
- test relevante fallando;
- descubrimiento pendiente;
- cambio de alcance pendiente de aprobación;
- conflicto arquitectónico pendiente;
- documentación relevante en inglés.
