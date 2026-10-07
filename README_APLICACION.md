# Overlay OpenCode V3 — migración y optimización

Este paquete es un overlay seguro, no un reemplazo completo del proyecto.

## Archivos

- `MIGRACION_V3.md`: versión corregida del plan de migración.
- `OPTIMIZACION_TOKENS_V3.md`: política transversal de consumo de contexto/tokens.
- `opencode.optimizations.jsonc`: bloque de configuración para fusionar con el `opencode.json` V3 real.
- `.opencode/templates/STATE.md`: persistencia de estado.
- `.opencode/templates/DISCOVERIES.md`: registro de descubrimientos.
- `.opencode/templates/TASKS.md`: registro de tareas.

## Aplicación recomendada

1. Reemplazar la documentación de migración por `MIGRACION_V3.md`.
2. Incorporar `OPTIMIZACION_TOKENS_V3.md` a la documentación de infraestructura.
3. Fusionar manualmente `opencode.optimizations.jsonc` con el `opencode.json` V3 real.
4. No restaurar agentes obsoletos (`spec-checker`, etc.) desde configuraciones antiguas.
5. Copiar las tres plantillas solo si no existe una versión equivalente más completa.
6. Ejecutar la validación V3 del proyecto.
7. Registrar el resultado en `STATE.md`.

## Nota de compatibilidad

OpenCode ha tenido cambios de esquema entre líneas de versión. Antes de aplicar un campo de configuración en producción, validar contra el `$schema` instalado y el comando de validación del proyecto.

El overlay usa los campos documentados en la rama principal actual para compactación y permisos, pero el proyecto debe mantener compatibilidad con la versión efectivamente instalada.
