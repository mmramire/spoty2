---
name: library-research
description: Investigar librerías, APIs y documentación técnica actual antes de recomendar o incorporar una dependencia.
metadata:
  categoria: investigacion
  idioma: español
---

# Investigación de librerías

## Orden de fuentes

1. documentación oficial;
2. repositorio oficial;
3. registro oficial de paquetes;
4. documentación secundaria de calidad;
5. foros o discusiones comunitarias solo como apoyo.

## Verificaciones

- versión actual relevante;
- compatibilidad con Node.js 22 y TypeScript;
- soporte ESM;
- API necesaria;
- mantenimiento;
- licencia;
- tamaño y dependencias transitivas;
- seguridad y avisos conocidos cuando estén disponibles;
- compatibilidad con la arquitectura del proyecto.

## Resultado

No instalar automáticamente.

Generar una recomendación con ventajas, desventajas, riesgos y alternativa de no incorporar una dependencia.

Una dependencia nueva solo puede incorporarse cuando esté justificada por la tarea y no contradiga la especificación o la arquitectura.
