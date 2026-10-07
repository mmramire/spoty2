# Regla de fase: arquitectura

La arquitectura describe cómo construir la solución sin redefinir el alcance.

## Reglas

- Mantener `Presentation → Business → Data`.
- Las dependencias apuntan hacia capas apropiadas y no introducen ciclos.
- Los puntos de entrada deben quedar explícitos.
- La GUI o CLI pertenece a Presentation.
- Business expone casos de uso reutilizables y no depende de mecanismos de interacción.
- Data encapsula integración con Spotify, persistencia, filesystem y otros efectos secundarios.
- Un ADR se crea solo para una decisión significativa con alternativas y consecuencias.
- Si la arquitectura contradice requisitos, se bloquea la aprobación y se eleva el conflicto.
