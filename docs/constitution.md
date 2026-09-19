# Constitución — spoty-cli

Principios innegociables (Spec Driven Development):

1. **Stack minimalista**: Node v22+ (TypeScript). Dependencias limitadas al SDK de Spotify, Biome JS, Vitest y Pino.
2. **La spec manda**: Nada se implementa sin figurar en la spec activa. Ante la duda, se pausa y pregunta.
3. **Arquitectura N-Tier**: Separación estricta en capas (Presentation -> Business -> Data). La capa Business no contiene lógica de CLI ni código HTTP; debe ser 100% reutilizable por un cliente/backend web (Angular) futuro.
4. **Formato y Calidad (Biome & Sonar Rules)**: Uso obligatorio de Biome JS para linting y formateo. Se deben cumplir reglas de baja complejidad cognitiva (reglas Sonar) e higiene OWASP (sin credenciales expuestas en código, tipado estricto sin `any`). El código debe pasar `biome check` sin errores.
5. **Tests como barrera (Vitest)**: Cada tarea cierra con sus unit tests en verde ejecutados con Vitest. Prohibido avanzar en rojo.
6. **Datos y Observabilidad**: Persistencia de tokens y bibliotecas en JSON local. Registro de ejecución obligatorio mediante Pino en `data/app.log` con niveles de log (INFO/ERROR) para la trazabilidad de errores durante el procesamiento.
7. **Empaquetado y Distribución**: El diseño debe permitir compilar la aplicación a un binario ejecutable único (Node.js SEA o `@yao-pkg/pkg`) para que usuarios no técnicos puedan ejecutarla sin instalar Node.js ni configurar la terminal.
8. **Idioma**: Código e identificadores en inglés; mensajes al usuario y documentación en español.

---

## Flujo de Trabajo (Workflow del Agente)

Para dar por completada cualquier tarea o funcionalidad, se debe ejecutar estrictamente la siguiente secuencia:

1. **Leer la Spec Activa**: Verificar los requerimientos y el alcance de la tarea en el archivo de especificación.
2. **Implementar en Capas (N-Tier)**: Escribir código respetando la separación entre `data`, `business` y `presentation`.
3. **Validación Estática (Biome)**: Ejecutar `npx @biomejs/biome check --write .` y corregir cualquier advertencia o error de sintaxis, formato o complejidad.
4. **Validación de Tests (Vitest)**: Ejecutar `npx vitest run` y asegurar que el 100% de las pruebas unitarias pasen en verde.
5. **Atención a SonarLint**: Si el usuario reporta una alerta detectada por SonarLint en el IDE, refactorizar aplicando la regla indicada antes de cerrar la tarea.