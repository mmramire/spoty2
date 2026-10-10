/**
 * TC-008 — Predicado de duplicado contra listas propias.
 *
 * Trazabilidad: OBJ-001 → RF-001 → UC-001-A1 → AC-005 → TASK-006 → TC-008.
 *
 * Prueba de unidad sin red, sin disco y sin terminal: `esDuplicadoPropio` es una
 * función pura que solo recibe las listas propias ya filtradas por Data
 * (BR-006, `ARCHITECTURE.md` §6.5), por lo que las listas ajenas homónimas no
 * pueden contar: no llegan a la función.
 */
import { readFileSync } from 'node:fs';
import { esDuplicadoPropio } from '@/business/playlists/validacion.js';
import { describe, expect, it } from 'vitest';

const RUTA_VALIDACION = 'src/business/playlists/validacion.ts';

interface PatronProhibido {
  readonly descripcion: string;
  readonly patron: RegExp;
}

const PATRONES_PROHIBIDOS: readonly PatronProhibido[] = [
  { descripcion: 'el tipo "any"', patron: /\bany\b/ },
  { descripcion: 'importaciones de Presentation', patron: /from\s+['"][^'"]*presentation/i },
  { descripcion: 'importaciones del punto de entrada CLI', patron: /from\s+['"][^'"]*cli/i },
  { descripcion: 'importaciones de Data', patron: /from\s+['"][^'"]*data\//i },
  { descripcion: 'importaciones de Pino', patron: /from\s+['"][^'"]*pino/i },
  {
    descripcion: 'el sistema de ficheros',
    patron: /from\s+['"]node:fs|\b(readFileSync|writeFileSync|appendFileSync)\b/,
  },
  { descripcion: 'uso de fetch (red)', patron: /\bfetch\s*\(/ },
  { descripcion: 'uso de process (terminal)', patron: /\bprocess\./ },
  { descripcion: 'uso de console (terminal)', patron: /\bconsole\./ },
];

function leerFuente(ruta: string): string {
  return readFileSync(new URL(`../../../${ruta}`, import.meta.url), 'utf8');
}

describe('TC-008 esDuplicadoPropio contra listas propias (TASK-006)', () => {
  describe('coincidencia exacta tras recorte de espacios en extremos (RF-001, BR-006)', () => {
    it('coincide cuando tras recortar los nombres son exactamente iguales', () => {
      expect(esDuplicadoPropio('Viaje 2026 ', ['Viaje 2026'])).toBe(true);
      expect(esDuplicadoPropio(' Viaje 2026', ['Viaje 2026'])).toBe(true);
      expect(esDuplicadoPropio('  Viaje 2026  ', ['Viaje 2026'])).toBe(true);
      expect(esDuplicadoPropio('Viaje 2026', ['  Viaje 2026  '])).toBe(true);
      expect(esDuplicadoPropio('Viaje 2026', ['Música', 'Viaje 2026'])).toBe(true);
    });

    it('no coincide cuando el nombre no está en la lista de propias', () => {
      expect(esDuplicadoPropio('Viaje 2026', [])).toBe(false);
      expect(esDuplicadoPropio('Viaje 2026', ['Música', 'Trabajo'])).toBe(false);
    });
  });

  describe('sensibilidad a mayúsculas: comparación exacta, no insensible (RF-001)', () => {
    it('Viaje no coincide con viaje en ninguna dirección', () => {
      expect(esDuplicadoPropio('Viaje', ['viaje'])).toBe(false);
      expect(esDuplicadoPropio('viaje', ['Viaje'])).toBe(false);
      expect(esDuplicadoPropio('VIAJE 2026', ['viaje 2026'])).toBe(false);
      expect(esDuplicadoPropio('viaje 2026', ['VIAJE 2026'])).toBe(false);
    });
  });

  describe('comparación exacta, no parcial ni difusa', () => {
    it('no coincide por contención ni por espacios interiores distintos', () => {
      expect(esDuplicadoPropio('Viaje', ['Viaje 2026'])).toBe(false);
      expect(esDuplicadoPropio('Viaje 2026', ['Viaje'])).toBe(false);
      expect(esDuplicadoPropio('Viaje  2026', ['Viaje 2026'])).toBe(false);
      expect(esDuplicadoPropio('Viaje2026', ['Viaje 2026'])).toBe(false);
    });
  });

  describe('las listas ajenas homónimas no cuentan (UC-001-A1, BR-006)', () => {
    it('solo puede haber coincidencia con un nombre presente en las propias recibidas', () => {
      // La homónima ajena no llega a la función: Data filtra antes (TASK-002).
      expect(esDuplicadoPropio('Viaje 2026', ['Música'])).toBe(false);
      expect(esDuplicadoPropio('Viaje 2026', ['Música', 'Trabajo'])).toBe(false);
      expect(esDuplicadoPropio('Fiesta', ['Viaje 2026'])).toBe(false);
    });

    it('con lista de propias vacía nunca hay duplicado', () => {
      expect(esDuplicadoPropio('Viaje 2026', [])).toBe(false);
      expect(esDuplicadoPropio('   ', [])).toBe(false);
    });
  });

  describe('pureza y capas (RNF-003, RNF-005)', () => {
    it('el módulo no contiene any ni acceso a red, disco o terminal', () => {
      const fuente = leerFuente(RUTA_VALIDACION);
      for (const { descripcion, patron } of PATRONES_PROHIBIDOS) {
        expect(fuente, `${RUTA_VALIDACION} no debe contener ${descripcion}`).not.toMatch(patron);
      }
    });

    it('las funciones son deterministas ante la misma entrada', () => {
      const propias = ['  Viaje 2026  ', 'Música'];
      expect(esDuplicadoPropio('Viaje 2026', propias)).toBe(
        esDuplicadoPropio('Viaje 2026', propias)
      );
      expect(esDuplicadoPropio('Viaje', propias)).toBe(esDuplicadoPropio('Viaje', propias));
    });

    it('no muta la lista de propias recibida', () => {
      const propias = [' Viaje 2026 ', 'Música'];
      esDuplicadoPropio('Viaje 2026', propias);
      expect(propias).toEqual([' Viaje 2026 ', 'Música']);
    });
  });
});
