# Regla de fase: implementación

## TDD obligatorio

Para tareas de comportamiento:

`RED → GREEN → REFACTOR`

No existe implementación de producción sin una prueba que exprese el comportamiento objetivo.

## Durante la implementación

- implementar una tarea a la vez;
- revisar trazabilidad antes de comenzar;
- cargar skills pertinentes;
- usar web para documentación actual cuando sea necesario;
- no introducir dependencias sin justificación;
- ejecutar pruebas después de cada cambio relevante;
- registrar evidencia TDD;
- detenerse ante descubrimientos.

## Descubrimientos

La implementación no modifica silenciosamente la especificación aprobada.

Todo vacío que afecte el comportamiento debe pasar por `DISC-XXX` y `change-analyzer`.
