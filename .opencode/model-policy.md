# Política de modelos

Esta política separa la responsabilidad del agente de la disponibilidad temporal de los modelos gratuitos.

## Orden recomendado por responsabilidad

### Razonamiento y aprobación

1. `opencode/muse-spark-1.3-contributor-free`
2. `opencode/mimo-v2.6-flash-free`
3. `opencode/ling-3.1-flash-free`
4. `opencode/nemotron-3.5-lightning-free`
5. `opencode/big-pickle`

Se usa para especificación, revisión, arquitectura, análisis de cambios y validación final.

### Código y TDD

1. `opencode/mimo-v2.6-flash-free`
2. `opencode/muse-spark-1.3-contributor-free`
3. `opencode/longcat-2.5-preview-free`
4. `opencode/ling-3.1-flash-free`
5. `opencode/nemotron-3.5-lightning-free`
6. `opencode/big-pickle`

Se usa para planificación de tareas técnicas, TDD, implementación y revisión de pruebas.

### Investigación

1. `opencode/ling-3.1-flash-free`
2. `opencode/muse-spark-1.3-contributor-free`
3. `opencode/longcat-2.5-preview-free`
4. `opencode/mimo-v2.6-flash-free`
5. `opencode/big-pickle`

Se usa para investigar librerías, APIs, documentación y skills externas.

### Liberación y Git

1. `opencode/ling-3.1-flash-free`
2. `opencode/mimo-v2.6-flash-free`
3. `opencode/muse-spark-1.3-contributor-free`
4. `opencode/big-pickle`

Se usa para commits y tareas auxiliares de liberación.

### Datos sensibles

Cuando el trabajo contenga datos que no deban enviarse a un modelo remoto, se puede seleccionar `ollama/qwen3.5:latest` siempre que ese modelo esté realmente disponible localmente y sea adecuado para la tarea.

No se considera un fallback automático para las tareas normales.

## Estrategia de fallback

OpenCode permite seleccionar modelos mediante `/models` y configurar un modelo por agente, pero esta configuración no asume una cadena de fallback por agente no documentada oficialmente.

Por eso el proyecto mantiene una cadena explícita en `.opencode/model-policy.json`.

Cuando un modelo desaparece:

1. comprobar `/models`;
2. identificar el siguiente modelo disponible de la cadena correspondiente al rol;
3. ejecutar `node scripts/opencode-v3-models.mjs promote <rol> <indice>`;
4. verificar con `node scripts/opencode-v3-models.mjs sync` y `node scripts/opencode-v3-models.mjs verify`;
5. reiniciar la sesión si el modelo ya había sido seleccionado en una sesión existente.

Ejemplo:

```text
node scripts/opencode-v3-models.mjs promote coding 1
node scripts/opencode-v3-models.mjs verify
```

El índice comienza en `1` y representa el primer fallback de ese rol.

## Modelos de la captura de disponibilidad actual

La configuración v3 conoce los siguientes modelos que forman parte del inventario que motivó este diseño:

- Big Pickle
- Exo Free
- Fledge Alpha Free
- Ling 3.0 Flash Fin Free
- Ling 3.1 Flash Free
- LongCat 2.5 Preview Free
- MiMo-V2.6-Flash Free
- Muse Spark 1.3 Free
- Nemotron 3 Ultra Free
- Nemotron 3.5 Lightning Free
- Space Bunny Free
- Ollama `qwen3.5:latest`

La asignación activa se limita a los candidatos seleccionados por esta política. Los demás quedan fuera del camino crítico hasta que se evalúen.

## Nota de mantenimiento

El nombre mostrado en la interfaz no debe copiarse literalmente como identificador de configuración. Usar el ID de catálogo `provider/model` que OpenCode exponga para el modelo actual.
