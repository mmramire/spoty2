---
description: Iniciar una nueva feature con el flujo SDD y crear sus artefactos base.
agent: sdd
---

Inicia la feature `$ARGUMENTS`.

Orquesta `feature-planner`, crea los artefactos SDD usando los templates de features SDD (los archivos `.template` de `.opencode/templates/`, nunca los archivos de migración V2 → V3 sin extensión), establece el `STATE.md` de la feature (artefacto vivo) en revisión y no inicies implementación.

Comprueba que exista un punto de inicio concreto para cada flujo que requiera interacción.

Aplica todas las políticas transversales del proyecto.
