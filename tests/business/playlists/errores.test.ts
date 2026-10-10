/**
 * TC-009 — Clasificación de errores de Data en resultados de dominio (TASK-007).
 *
 * Trazabilidad: OBJ-001 → RF-002, RNF-001 → UC-001-E1, UC-001-E2 → AC-004 →
 * TASK-007 → TC-009.
 *
 * La función es pura: no produce mensajes de usuario (los literales de RF-002
 * los elige Presentation) ni efectos secundarios, y la causa que devuelve
 * nunca contiene cuerpos de respuesta, cabeceras ni testigos (RNF-001).
 */
import { readFileSync } from 'node:fs';
import { clasificarErrorData } from '@/business/playlists/errores.js';
import type { ResultadoCreacion } from '@/business/playlists/types.js';
import { describe, expect, it } from 'vitest';

/** Doble con la forma estructural del error tipado de Data, sin importar de Data. */
class ErrorApiPrueba extends Error {
  readonly estado: number;
  readonly causa: string;
  readonly reintentoTras?: number;

  constructor(estado: number, causa?: string, reintentoTras?: number) {
    const detalle = causa ?? `HTTP ${estado}`;
    super(detalle);
    this.name = 'ErrorApiPrueba';
    this.estado = estado;
    this.causa = detalle;
    if (reintentoTras !== undefined) {
      this.reintentoTras = reintentoTras;
    }
  }
}

/** Literales de usuario aprobados en RF-002: Business no puede producirlos. */
const LITERALES_USUARIO_RF002: readonly string[] = [
  'No hay sesión activa. Conecta con Spotify con la opción 1',
  'Sesión caducada. Vuelve a conectar con Spotify.',
  'Permisos insuficientes para crear la playlist.',
  'Vuelva a intentarlo más tarde',
  'No se pudo crear la playlist por un error inesperado.',
];

const RUTA_FUENTE = 'src/business/playlists/errores.ts';

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
  { descripcion: 'uso de fetch', patron: /\bfetch\s*\(/ },
  { descripcion: 'uso de process', patron: /\bprocess\./ },
  { descripcion: 'uso de console', patron: /\bconsole\./ },
  { descripcion: 'uso de readline', patron: /\breadline\b/ },
];

function leerFuente(): string {
  return readFileSync(new URL(`../../../${RUTA_FUENTE}`, import.meta.url), 'utf8');
}

describe('errores.ts - clasificación de errores de Data (TASK-007, TC-009)', () => {
  it('TC-009: sin sesión (null o undefined) produce SinSesion (UC-001-E1)', () => {
    expect(clasificarErrorData(null)).toEqual({ resultado: 'sinSesion' });
    expect(clasificarErrorData(undefined)).toEqual({ resultado: 'sinSesion' });
  });

  it('TC-009: 401 produce SesionCaducada con causa', () => {
    expect(clasificarErrorData(new ErrorApiPrueba(401))).toEqual({
      resultado: 'sesionCaducada',
      causa: 'HTTP 401',
    });
  });

  it('TC-009: 403 produce PermisosInsuficientes con causa', () => {
    expect(clasificarErrorData(new ErrorApiPrueba(403))).toEqual({
      resultado: 'permisosInsuficientes',
      causa: 'HTTP 403',
    });
  });

  it('TC-009: 429 persistente produce LimiteAgotado conservando reintentoTras', () => {
    expect(clasificarErrorData(new ErrorApiPrueba(429, 'HTTP 429', 7))).toEqual({
      resultado: 'limiteAgotado',
      causa: 'HTTP 429',
      reintentoTras: 7,
    });

    const sinDato = clasificarErrorData(new ErrorApiPrueba(429));
    expect(sinDato).toEqual({ resultado: 'limiteAgotado', causa: 'HTTP 429' });
    expect('reintentoTras' in sinDato).toBe(false);
  });

  it('TC-009: el resto de estados y los errores no estructurados producen FalloInesperado', () => {
    for (const estado of [400, 404, 500, 502, 503]) {
      expect(clasificarErrorData(new ErrorApiPrueba(estado))).toEqual({
        resultado: 'falloInesperado',
        causa: `HTTP ${estado}`,
      });
    }

    expect(clasificarErrorData(new Error('fallo de red'))).toEqual({
      resultado: 'falloInesperado',
      causa: 'fallo de red',
    });
    expect(clasificarErrorData({})).toEqual({
      resultado: 'falloInesperado',
      causa: 'error sin causa detallada',
    });
    expect(clasificarErrorData('fallo no estructurado')).toEqual({
      resultado: 'falloInesperado',
      causa: 'fallo no estructurado',
    });

    const desconocido = clasificarErrorData(0);
    expect(desconocido).toEqual({
      resultado: 'falloInesperado',
      causa: 'error sin causa detallada',
    });
  });

  it('TC-009: la causa no contiene testigos, cabeceras ni cuerpos de respuesta (RNF-001)', () => {
    const causasConSecretos = [
      'Bearer eyJhbGciOiJIUzI1NiJ9.abcdefgh.ijklmnop',
      'authorization: Bearer testigo-secreto-123',
      'access_token=secreto-abc123',
      '{"error":{"status":500,"message":"Internal Server Error"}}',
      'fallo interno {"detalle":"cuerpo sensible"}',
      'set-cookie: sessionid=valor-cookie',
    ];

    for (const origen of causasConSecretos) {
      const resultado = clasificarErrorData(new ErrorApiPrueba(500, origen));
      const causa = resultado.resultado === 'falloInesperado' ? resultado.causa : '';
      expect(causa, `causa depurada de "${origen}"`).not.toMatch(/bearer/i);
      expect(causa).not.toMatch(/eyJhbGciOiJIUzI1NiJ9/);
      expect(causa).not.toMatch(/access_token/i);
      expect(causa).not.toMatch(/authorization/i);
      expect(causa).not.toMatch(/set-cookie|sessionid|cookie=/i);
      expect(causa).not.toMatch(/testigo-secreto-123|secreto-abc123|valor-cookie/);
      expect(causa).not.toMatch(/Internal Server Error|cuerpo sensible/);
      expect(causa.startsWith('{')).toBe(false);
      expect(causa.length).toBeLessThanOrEqual(210);
    }

    // La depuración no impide clasificar: el desenlace sigue siendo correcto.
    expect(clasificarErrorData(new ErrorApiPrueba(401, 'Bearer testigo-123'))).toEqual({
      resultado: 'sesionCaducada',
      causa: '[dato omitido]',
    });
  });

  it('TC-009: ninguna rama produce mensajes de usuario en español de RF-002', () => {
    const entradas: unknown[] = [
      null,
      undefined,
      new ErrorApiPrueba(401),
      new ErrorApiPrueba(403),
      new ErrorApiPrueba(429, 'HTTP 429', 3),
      new ErrorApiPrueba(500),
      new Error('fallo genérico'),
      'algo inesperado',
    ];

    for (const entrada of entradas) {
      const serializado = JSON.stringify(clasificarErrorData(entrada));
      for (const literal of LITERALES_USUARIO_RF002) {
        expect(serializado, `no debe contener "${literal}"`).not.toContain(literal);
      }
    }

    const fuente = leerFuente();
    for (const literal of LITERALES_USUARIO_RF002) {
      expect(fuente, `el módulo no debe declarar "${literal}"`).not.toContain(literal);
    }
  });

  it('TC-009: es una función pura sin efectos secundarios ni violación de capas', () => {
    const fuente = leerFuente();
    for (const { descripcion, patron } of PATRONES_PROHIBIDOS) {
      expect(fuente, `${RUTA_FUENTE} no debe contener ${descripcion}`).not.toMatch(patron);
    }
  });

  it('TC-009: es determinista y no muta la entrada recibida', () => {
    const error = new ErrorApiPrueba(429, 'HTTP 429', 5);
    const antes = { estado: error.estado, causa: error.causa, reintentoTras: error.reintentoTras };

    const primera = clasificarErrorData(error);
    const segunda = clasificarErrorData(error);

    expect(segunda).toEqual(primera);
    expect({
      estado: error.estado,
      causa: error.causa,
      reintentoTras: error.reintentoTras,
    }).toEqual(antes);
  });

  it('TC-009: los desenlaces clasificados encajan en ResultadoCreacion (TASK-001 intacto)', () => {
    const resultados: ResultadoCreacion[] = [
      clasificarErrorData(null),
      clasificarErrorData(new ErrorApiPrueba(401)),
      clasificarErrorData(new ErrorApiPrueba(403)),
      clasificarErrorData(new ErrorApiPrueba(429, 'HTTP 429', 7)),
      clasificarErrorData(new ErrorApiPrueba(500)),
    ];

    expect(resultados.map((resultado) => resultado.resultado)).toEqual([
      'sinSesion',
      'sesionCaducada',
      'permisosInsuficientes',
      'limiteAgotado',
      'falloInesperado',
    ]);
  });
});
