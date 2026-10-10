/**
 * TC-006 — Política de reintento ante 429 parametrizable (ADR-001).
 *
 * Trazabilidad: OBJ-001 → RF-002, RNF-005, RNF-006 → UC-001-E2 → AC-004 →
 * TASK-004 → TC-006.
 *
 * Todas las esperas pasan por el puerto `Espera` inyectado: ninguna prueba usa
 * temporizadores reales ni `vi.useFakeTimers`. La advertencia de cada reintento
 * se emite vía `RegistroTecnico` con intento y estado (RNF-006).
 */
import {
  type ErrorConEstado,
  politicaReintento429,
} from '@/business/playlists/politica-reintento.js';
import type { CamposRegistro, Espera, RegistroTecnico } from '@/business/playlists/puertos.js';
import { withRetry } from '@/business/retry/retry.js';
import { describe, expect, it, vi } from 'vitest';

/** Doble de error tipado con la forma estructural `ErrorConEstado`. */
class ErrorApiPrueba extends Error implements ErrorConEstado {
  readonly estado: number;
  readonly reintentoTras?: number;

  constructor(estado: number, reintentoTras?: number) {
    super(`HTTP ${estado}`);
    this.name = 'ErrorApiPrueba';
    this.estado = estado;
    if (reintentoTras !== undefined) {
      this.reintentoTras = reintentoTras;
    }
  }
}

/** Dobles de `Espera` y `RegistroTecnico` que capturan lo observado. */
function crearDobles() {
  const retardos: number[] = [];
  const espera: Espera = {
    esperar: async (milisegundos) => {
      retardos.push(milisegundos);
    },
  };
  const advertencia = vi.fn<(mensaje: string, campos?: CamposRegistro) => void>();
  const error = vi.fn<(mensaje: string, campos?: CamposRegistro) => void>();
  const registro: RegistroTecnico = {
    info: vi.fn(),
    advertencia,
    error,
  };
  return { retardos, espera, advertencia, error, registro };
}

describe('politica-reintento.ts - Política de reintento ante 429 (ADR-001)', () => {
  describe('política', () => {
    it('TC-006: permite 3 reintentos (hasta 4 intentos totales)', () => {
      expect(politicaReintento429.maxRetries).toBe(3);
      const error = new ErrorApiPrueba(429);
      expect(politicaReintento429.shouldRetry(error, 0)).toBe(true);
      expect(politicaReintento429.shouldRetry(error, 1)).toBe(true);
      expect(politicaReintento429.shouldRetry(error, 2)).toBe(true);
      expect(politicaReintento429.shouldRetry(error, 3)).toBe(false);
    });

    it('TC-006: no reintenta estados distintos de 429', () => {
      for (const estado of [400, 401, 403, 500]) {
        expect(politicaReintento429.shouldRetry(new ErrorApiPrueba(estado), 0)).toBe(false);
      }
    });

    it('TC-006: getDelay usa reintentoTras * 1000 si es mayor que 0 y 10000 en su ausencia', () => {
      const error = new ErrorApiPrueba(429);
      expect(politicaReintento429.getDelay(error, 0, 7)).toBe(7000);
      expect(politicaReintento429.getDelay(error, 0, 1)).toBe(1000);
      expect(politicaReintento429.getDelay(error, 0, 0)).toBe(10000);
      expect(politicaReintento429.getDelay(error, 0, -2)).toBe(10000);
      expect(politicaReintento429.getDelay(error, 0)).toBe(10000);
      expect(politicaReintento429.getDelay(new ErrorApiPrueba(429, 5), 0)).toBe(5000);
    });

    it('TC-006: reconoce estructuralmente el error con estado sin depender de una clase', () => {
      expect(politicaReintento429.matchesError?.({ estado: 429, reintentoTras: 3 })).toBe(true);
      expect(politicaReintento429.matchesError?.({ estado: 429 })).toBe(true);
      expect(politicaReintento429.matchesError?.({ estado: '429' })).toBe(false);
      expect(politicaReintento429.matchesError?.(new Error('fallo genérico'))).toBe(false);
      expect(politicaReintento429.matchesError?.(null)).toBe(false);
    });
  });

  describe('withRetry con la política, Espera y RegistroTecnico inyectados', () => {
    it('TC-006:429 persistente produce 4 intentos, 3 esperas y 3 advertencias con intento y estado', async () => {
      const { retardos, espera, advertencia, error, registro } = crearDobles();
      const operacion = vi.fn(async () => {
        throw new ErrorApiPrueba(429, 7);
      });

      await expect(
        withRetry(operacion, politicaReintento429, {}, { espera, registro })
      ).rejects.toThrow('HTTP 429');

      expect(operacion).toHaveBeenCalledTimes(4);
      expect(retardos).toEqual([7000, 7000, 7000]);
      expect(advertencia).toHaveBeenCalledTimes(3);
      const llamadas = advertencia.mock.calls;
      for (const [indice, [, campos]] of llamadas.entries()) {
        expect(campos?.intento).toBe(indice + 1);
        expect(campos?.estado).toBe(429);
      }
      // El error final lo emite el caso de uso al clasificar (TASK-009); la
      // política solo emite la advertencia de cada reintento (RNF-006).
      expect(error).not.toHaveBeenCalled();
    });

    it('TC-006: espera 10000 ms por reintento cuando Retry-After no aporta segundos', async () => {
      const { retardos, espera, registro } = crearDobles();
      const operacion = vi.fn(async () => {
        throw new ErrorApiPrueba(429);
      });

      await expect(
        withRetry(operacion, politicaReintento429, {}, { espera, registro })
      ).rejects.toThrow('HTTP 429');

      expect(retardos).toEqual([10000, 10000, 10000]);
    });

    it('TC-006: no usa temporizadores reales; toda espera pasa por el puerto Espera', async () => {
      const { retardos, espera, registro } = crearDobles();
      const operacion = vi.fn(async () => {
        throw new ErrorApiPrueba(429);
      });

      const inicio = Date.now();
      await expect(
        withRetry(operacion, politicaReintento429, {}, { espera, registro })
      ).rejects.toThrow('HTTP 429');
      const transcurrido = Date.now() - inicio;

      const esperaDeclarada = retardos.reduce((total, milisegundos) => total + milisegundos, 0);
      expect(esperaDeclarada).toBe(30000);
      expect(transcurrido).toBeLessThan(1000);
    });

    it('TC-006: devuelve el resultado cuando una llamada posterior tiene éxito', async () => {
      const { retardos, espera, advertencia, registro } = crearDobles();
      const operacion = vi
        .fn()
        .mockRejectedValueOnce(new ErrorApiPrueba(429, 2))
        .mockRejectedValueOnce(new ErrorApiPrueba(429))
        .mockResolvedValue('creada');

      const resultado = await withRetry(operacion, politicaReintento429, {}, { espera, registro });

      expect(resultado).toBe('creada');
      expect(operacion).toHaveBeenCalledTimes(3);
      expect(retardos).toEqual([2000, 10000]);
      expect(advertencia).toHaveBeenCalledTimes(2);
    });

    it('TC-006: un 401 se propaga sin reintentos ni advertencias', async () => {
      const { retardos, espera, advertencia, registro } = crearDobles();
      const operacion = vi.fn(async () => {
        throw new ErrorApiPrueba(401);
      });

      await expect(
        withRetry(operacion, politicaReintento429, {}, { espera, registro })
      ).rejects.toThrow('HTTP 401');

      expect(operacion).toHaveBeenCalledTimes(1);
      expect(retardos).toEqual([]);
      expect(advertencia).not.toHaveBeenCalled();
    });
  });
});
