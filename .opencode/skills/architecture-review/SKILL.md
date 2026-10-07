---
name: architecture-review
description: Revisar que una implementación mantenga separación de capas, dirección de dependencias y puntos de entrada claramente definidos.
metadata:
  categoria: arquitectura
  idioma: español
---

# Revisión arquitectónica

## Capas

`Presentation → Business → Data`

## Verificaciones

- Presentation inicia y coordina la interacción.
- Business contiene reglas de negocio y casos de uso reutilizables.
- Data encapsula acceso externo y persistencia.
- Business no depende de Presentation.
- Business no depende de CLI.
- Las entradas a los flujos están definidas.
- Los efectos secundarios están aislados.
- La futura GUI puede reutilizar la capa Business sin duplicar reglas.

## Resultado

Informar conflictos por capa, dependencia, punto de entrada o responsabilidad.
