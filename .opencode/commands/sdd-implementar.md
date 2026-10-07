---
description: Implementar una feature o tarea siguiendo TDD y el control de cambios de la v3.
agent: sdd
---

Implementa `$ARGUMENTS`.

Primero verifica `IMPLEMENTATION_READY`. Para cada tarea de comportamiento delega en `tdd-implementer` y exige RED → GREEN → REFACTOR.

Si el implementador devuelve `DISCOVERY_REQUIRES_ANALYSIS`, no improvises. Delega `change-analyzer`, aplica su decisión y replanifica antes de continuar.

No declares completada la feature desde este comando. La finalización corresponde a `final-validator`.
