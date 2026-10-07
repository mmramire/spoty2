# Regla de fase: gestión de cambios

## Clasificación

Todo descubrimiento durante implementación debe clasificarse como una de estas categorías:

- `PLANNING_OMISSION`: la necesidad ya estaba implícita o explícita.
- `SPEC_CORRECTION`: la especificación es internamente incorrecta o inconsistente.
- `SCOPE_CHANGE`: aparece un comportamiento nuevo no contemplado.
- `ARCHITECTURE_CONFLICT`: la solución prevista no es compatible con las restricciones arquitectónicas.
- `TECHNICAL_BLOCKER`: existe un bloqueo técnico que requiere decisión.

## Flujo

`DISCOVERY → IMPACT ANALYSIS → DECISION → REPLAN → IMPLEMENT`

Para `SCOPE_CHANGE`, `ARCHITECTURE_CONFLICT` o decisiones que cambien requisitos aprobados se requiere aprobación humana.

## Regla de mínimo cambio

Actualizar solo los artefactos afectados por el cambio. No regenerar todo el conjunto documental si no es necesario.
