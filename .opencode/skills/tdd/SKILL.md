---
name: tdd
description: Aplicar desarrollo guiado por pruebas mediante el ciclo RED, GREEN y REFACTOR durante la implementación de tareas.
compatibility: Node.js 22+, TypeScript, Vitest
metadata:
  categoria: desarrollo
  idioma: español
  alcance: implementación
---

# Desarrollo guiado por pruebas

## Cuándo usarla

Usar esta skill para cualquier tarea que introduzca o cambie comportamiento ejecutable.

## Procedimiento

1. Leer la tarea y sus relaciones de trazabilidad.
2. Expresar el comportamiento esperado mediante una prueba.
3. Ejecutar la prueba y obtener `RED` por la ausencia del comportamiento esperado.
4. Implementar el mínimo cambio necesario.
5. Obtener `GREEN`.
6. Refactorizar sin cambiar el comportamiento observable.
7. Ejecutar nuevamente las pruebas relevantes.
8. Registrar la evidencia.

## Restricciones

No saltar directamente a implementación de producción.

No modificar la especificación para hacer pasar una prueba.

No considerar una prueba que falla por mala configuración como evidencia válida de `RED`.
