---
name: testing
description: Seleccionar y diseñar pruebas unitarias, de integración y aceptación adecuadas al comportamiento de una tarea.
compatibility: Node.js 22+, TypeScript, Vitest
metadata:
  categoria: pruebas
  idioma: español
---

# Estrategia de pruebas

## Principios

- Preferir pruebas pequeñas y deterministas.
- Probar comportamiento observable y contratos.
- Evitar mocks extensos y frágiles.
- Cubrir casos normales, límites y errores importantes.
- Mantener independencia entre pruebas.

## Niveles

### Unidad

Para reglas de negocio, transformaciones, validaciones y lógica aislada.

### Integración

Para comprobar la interacción entre capas, adaptadores, persistencia o clientes externos simulados de forma controlada.

### Aceptación

Para comprobar que los criterios Gherkin se cumplen desde el punto de vista del comportamiento del usuario o del sistema.

## Trazabilidad

Cada test debe poder asociarse con `TC-XXX` y con `TASK-XXX`. Cuando corresponda también con `AC-XXX`.
