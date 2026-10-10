/**
 * TC-007 (nivel tipo) — Predicados de validación de TASK-005.
 *
 * Trazabilidad: OBJ-001 → RF-001 → UC-001, UC-001-E3 → AC-002, AC-005 →
 * TASK-005 → TC-007.
 *
 * Fija en compilación que la modalidad colaborativa no es representable y que
 * los predicados exponen las firmas previstas (BR-004, BR-005).
 */
import type {
  EntradaVisibilidad,
  ErrorValidacion,
  Visibilidad,
} from '@/business/playlists/types.js';
import {
  esLongitudValida,
  recortarNombre,
  resolverDescripcionEfectiva,
  resolverVisibilidad,
} from '@/business/playlists/validacion.js';
import { describe, expectTypeOf, it } from 'vitest';

describe('TC-007 nivel tipo - predicados de validación (TASK-005)', () => {
  it('la visibilidad obligatoria y excluyente no admite la modalidad colaborativa', () => {
    expectTypeOf<Extract<EntradaVisibilidad, 'colaborativa'>>().toEqualTypeOf<never>();
    expectTypeOf<Visibilidad>().toEqualTypeOf<'publica' | 'privada'>();
    expectTypeOf<'colaborativa'>().not.toExtend<EntradaVisibilidad>();
  });

  it('resolverVisibilidad devuelve la visibilidad o ErrorValidacion de visibilidad', () => {
    expectTypeOf(resolverVisibilidad('publica')).toEqualTypeOf<Visibilidad | ErrorValidacion>();
    expectTypeOf(resolverVisibilidad('ausente')).toEqualTypeOf<Visibilidad | ErrorValidacion>();
  });

  it('los predicados admiten la entrada en bruto sin any', () => {
    expectTypeOf(esLongitudValida).toEqualTypeOf<(nombre: string | undefined) => boolean>();
    expectTypeOf(recortarNombre).toEqualTypeOf<(nombre: string) => string>();
    expectTypeOf(resolverDescripcionEfectiva).toEqualTypeOf<(descripcion?: string) => string>();
  });
});
