/**
 * TC-007 — Predicados puros de validación de nombre, descripción y visibilidad.
 *
 * Trazabilidad: OBJ-001 → RF-001 → UC-001, UC-001-E3 → AC-002, AC-005 →
 * TASK-005 → TC-007.
 *
 * Prueba de unidad sin red, sin disco y sin terminal: las funciones son puras y
 * la ausencia de efectos secundarios se comprueba sobre el código fuente.
 */
import { readFileSync } from 'node:fs';
import type { ErrorValidacion } from '@/business/playlists/types.js';
import {
  esLongitudValida,
  recortarNombre,
  resolverDescripcionEfectiva,
  resolverVisibilidad,
} from '@/business/playlists/validacion.js';
import { describe, expect, it } from 'vitest';

const DESCRIPCION_POR_DEFECTO = 'Playlist sin descripción';
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
  {
    descripcion: 'la modalidad colaborativa como valor de cadena',
    patron: /['"]colaborativa['"]/i,
  },
  { descripcion: 'la modalidad colaborativa de la API', patron: /\bcollaborative\b/i },
];

function leerFuente(ruta: string): string {
  return readFileSync(new URL(`../../../${ruta}`, import.meta.url), 'utf8');
}

describe('TC-007 predicados puros de validación (TASK-005)', () => {
  describe('recorte de espacios en extremos (RF-001, BR-004)', () => {
    it('recorta los espacios extremos sin alterar el interior del nombre', () => {
      expect(recortarNombre('  Viaje 2026  ')).toBe('Viaje 2026');
      expect(recortarNombre('Viaje 2026')).toBe('Viaje 2026');
      expect(recortarNombre('Viaje  2026')).toBe('Viaje  2026');
      expect(recortarNombre('   ')).toBe('');
    });
  });

  describe('esLongitudValida — 3 a 100 caracteres visibles (BR-004)', () => {
    it('acepta longitudes de 3 a 100 tras el recorte', () => {
      expect(esLongitudValida('abc')).toBe(true);
      expect(esLongitudValida('Viaje 2026')).toBe(true);
      expect(esLongitudValida('a'.repeat(100))).toBe(true);
      expect(esLongitudValida('  abc  ')).toBe(true);
      expect(esLongitudValida(' abc ')).toBe(true);
    });

    it('rechaza vacío, solo espacios, nombre ausente y longitudes fuera de rango', () => {
      expect(esLongitudValida('')).toBe(false);
      expect(esLongitudValida('   ')).toBe(false);
      expect(esLongitudValida(undefined)).toBe(false);
      expect(esLongitudValida('ab')).toBe(false);
      expect(esLongitudValida('  ab  ')).toBe(false);
      expect(esLongitudValida('a'.repeat(101))).toBe(false);
    });

    it('mide caracteres visibles: un emoji parcial de surrogate no cuenta como carácter', () => {
      expect(esLongitudValida('😀😀')).toBe(false);
      expect(esLongitudValida('😀😀😀')).toBe(true);
    });
  });

  describe('resolverDescripcionEfectiva — valor aportado o defecto (RF-001, P-004)', () => {
    it('resuelve el valor por defecto cuando la descripción es vacía o solo espacios', () => {
      expect(resolverDescripcionEfectiva()).toBe(DESCRIPCION_POR_DEFECTO);
      expect(resolverDescripcionEfectiva('')).toBe(DESCRIPCION_POR_DEFECTO);
      expect(resolverDescripcionEfectiva('   ')).toBe(DESCRIPCION_POR_DEFECTO);
    });

    it('resuelve el valor aportado no vacío', () => {
      expect(resolverDescripcionEfectiva('Carretera')).toBe('Carretera');
      expect(resolverDescripcionEfectiva('  Carretera  ')).toBe('Carretera');
    });
  });

  describe('resolverVisibilidad — obligatoria y excluyente (BR-005)', () => {
    it('acepta un único indicador: --public o --private', () => {
      expect(resolverVisibilidad('publica')).toBe('publica');
      expect(resolverVisibilidad('privada')).toBe('privada');
    });

    it('produce ErrorValidacion de visibilidad ante la ausencia o la doble presencia', () => {
      const esperado: ErrorValidacion = { resultado: 'errorValidacion', campo: 'visibilidad' };
      expect(resolverVisibilidad('ausente')).toEqual(esperado);
      expect(resolverVisibilidad('doble')).toEqual(esperado);
    });
  });

  describe('pureza y capas (RNF-003, RNF-005)', () => {
    it('el módulo no contiene any, colaborativa ni acceso a red, disco o terminal', () => {
      const fuente = leerFuente(RUTA_VALIDACION);
      for (const { descripcion, patron } of PATRONES_PROHIBIDOS) {
        expect(fuente, `${RUTA_VALIDACION} no debe contener ${descripcion}`).not.toMatch(patron);
      }
    });

    it('las funciones son deterministas ante la misma entrada', () => {
      const nombre = '  Viaje 2026  ';
      expect(recortarNombre(nombre)).toBe(recortarNombre(nombre));
      expect(esLongitudValida(nombre)).toBe(esLongitudValida(nombre));
      expect(resolverDescripcionEfectiva(nombre)).toBe(resolverDescripcionEfectiva(nombre));
      expect(resolverVisibilidad('ausente')).toEqual(resolverVisibilidad('ausente'));
    });
  });
});
