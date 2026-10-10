/**
 * TC-014 y TC-015 — Reintentos 429 y errores de servicio en el caso de uso
 * `crearPlaylistVacia` (TASK-009).
 *
 * Trazabilidad:
 * - TC-014: `OBJ-001 → RF-002, RNF-006 → UC-001-E2 → AC-004 → TASK-009 → TC-014`.
 * - TC-015: `OBJ-001 → RF-002, RNF-001, RNF-006 → UC-001-E2 → AC-004 →
 *   TASK-009 → TC-015`.
 *
 * Pruebas de unidad con dobles de los cuatro puertos y del canal de
 * confirmación: la espera pasa siempre por el doble de `Espera` (sin
 * temporizadores reales, ADR-001), el gateway solo lanza errores tipados y el
 * registro se observa como traza de eventos (RNF-003, RNF-005, RNF-006).
 */
import { crearPlaylistVacia } from '@/business/playlists/crear-playlist.js';
import type { CamposRegistro, DependenciasCreacion } from '@/business/playlists/puertos.js';
import type { SolicitudCreacion } from '@/business/playlists/types.js';
import { describe, expect, it } from 'vitest';

const TESTIGO_SESION = 'testigo-ficticio-secreto';

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

/** Evento observado en el doble de `RegistroTecnico`. */
interface Evento {
  readonly tipo: 'info' | 'advertencia' | 'error';
  readonly mensaje: string;
  readonly campos?: CamposRegistro;
}

/** Contexto de prueba: solicitud, dependencias dobladas y trazas observables. */
interface Contexto {
  readonly solicitud: SolicitudCreacion;
  readonly dependencias: DependenciasCreacion;
  /** Secuencia de efectos en orden de ejecución. */
  readonly traza: string[];
  readonly eventos: Evento[];
  readonly llamadas: { listar: number; crear: number; canal: number };
  readonly retardos: number[];
}

/** Crea un contexto cuyo gateway lanza siempre el error del factory indicado. */
function crearContexto(fabricaError: () => unknown): Contexto {
  const traza: string[] = [];
  const eventos: Evento[] = [];
  const llamadas = { listar: 0, crear: 0, canal: 0 };
  const retardos: number[] = [];

  const registrar = (tipo: Evento['tipo']) => (mensaje: string, campos?: CamposRegistro) => {
    traza.push(tipo);
    eventos.push(campos === undefined ? { tipo, mensaje } : { tipo, mensaje, campos });
  };

  const solicitud: SolicitudCreacion = {
    nombre: 'Viaje 2026',
    visibilidad: 'privada',
    canalConfirmacion: async () => {
      traza.push('canal');
      llamadas.canal += 1;
      return 'confirmada';
    },
  };

  const dependencias: DependenciasCreacion = {
    sesionProveedor: {
      obtenerSesionVigente: async () => {
        traza.push('sesion');
        return { testigoSesion: TESTIGO_SESION };
      },
    },
    playlistGateway: {
      listarPlaylistsPropias: async () => {
        traza.push('listar');
        llamadas.listar += 1;
        return [];
      },
      crearPlaylist: async () => {
        traza.push('crear');
        llamadas.crear += 1;
        throw fabricaError();
      },
    },
    registroTecnico: {
      info: registrar('info'),
      advertencia: registrar('advertencia'),
      error: registrar('error'),
    },
    espera: {
      esperar: async (milisegundos) => {
        retardos.push(milisegundos);
        traza.push('espera');
      },
    },
  };

  return { solicitud, dependencias, traza, eventos, llamadas, retardos };
}

function eventosDe(contexto: Contexto, tipo: Evento['tipo']): Evento[] {
  return contexto.eventos.filter((evento) => evento.tipo === tipo);
}

/** Fragmentos prohibidos en cualquier registro (RNF-001, AC-004). */
const PATRONES_SENSIBLES: readonly RegExp[] = [
  /bearer/i,
  /eyJ[A-Za-z0-9_-]{4,}/,
  /authorization/i,
  /testigo-secreto-123/,
  /cuerpo sensible/i,
  new RegExp(TESTIGO_SESION),
];

const CAUSA_SENSIBLE = [
  'authorization: Bearer testigo-secreto-123',
  'eyJhbGciOiJIUzI1NiJ9.abcdefgh.ijklmnop',
  '{"detalle":"cuerpo sensible"}',
].join(' ');

describe('TC-014 429 persistente bajo la política de reintento (TASK-009)', () => {
  it('429 sin cabecera: 4 intentos como máximo, 3 esperas de 10000 ms, 3 advertencias con intento y estado, LimiteAgotado y error final', async () => {
    const ctx = crearContexto(() => new ErrorApiPrueba(429));

    const resultado = await crearPlaylistVacia(ctx.solicitud, ctx.dependencias);

    expect(resultado).toEqual({ resultado: 'limiteAgotado', causa: 'HTTP 429' });
    expect(ctx.llamadas.crear).toBe(4);
    expect(ctx.retardos).toEqual([10000, 10000, 10000]);

    const advertencias = eventosDe(ctx, 'advertencia');
    expect(advertencias).toHaveLength(3);
    for (const [indice, evento] of advertencias.entries()) {
      expect(evento.campos?.intento).toBe(indice + 1);
      expect(evento.campos?.estado).toBe(429);
    }

    const errores = eventosDe(ctx, 'error');
    expect(errores).toHaveLength(1);
    expect(errores[0].campos).toEqual({ causa: 'HTTP 429' });
    expect(eventosDe(ctx, 'info')).toHaveLength(1);

    expect(ctx.traza).toEqual([
      'sesion',
      'listar',
      'canal',
      'info',
      'crear',
      'advertencia',
      'espera',
      'crear',
      'advertencia',
      'espera',
      'crear',
      'advertencia',
      'espera',
      'crear',
      'error',
    ]);
  });

  it('429 con Retry-After (reintentoTras = 7): cada espera es de 7000 ms y el desenlace sigue siendo LimiteAgotado', async () => {
    const ctx = crearContexto(() => new ErrorApiPrueba(429, undefined, 7));

    const resultado = await crearPlaylistVacia(ctx.solicitud, ctx.dependencias);

    expect(resultado).toMatchObject({ resultado: 'limiteAgotado', causa: 'HTTP 429' });
    expect(ctx.llamadas.crear).toBe(4);
    expect(ctx.retardos).toEqual([7000, 7000, 7000]);
    expect(eventosDe(ctx, 'advertencia')).toHaveLength(3);
    expect(eventosDe(ctx, 'error')).toHaveLength(1);
  });

  it('ningún registro contiene testigos, cabeceras de autorización ni cuerpos de respuesta (RNF-001)', async () => {
    const ctx = crearContexto(() => new ErrorApiPrueba(429, CAUSA_SENSIBLE, 3));

    const resultado = await crearPlaylistVacia(ctx.solicitud, ctx.dependencias);

    const serializado = JSON.stringify(ctx.eventos);
    for (const patron of PATRONES_SENSIBLES) {
      expect(serializado, `el registro no debe contener ${patron}`).not.toMatch(patron);
    }
    if (resultado.resultado === 'limiteAgotado') {
      for (const patron of PATRONES_SENSIBLES) {
        expect(resultado.causa, `la causa no debe contener ${patron}`).not.toMatch(patron);
      }
    }
    expect(ctx.llamadas.crear).toBeLessThanOrEqual(4);
  });
});

describe('TC-015 errores de servicio sin reintentos indebidos y sin datos sensibles (TASK-009)', () => {
  it('401 produce SesionCaducada con error final de causa depurada y sin reintentos', async () => {
    const ctx = crearContexto(() => new ErrorApiPrueba(401));

    const resultado = await crearPlaylistVacia(ctx.solicitud, ctx.dependencias);

    expect(resultado).toEqual({ resultado: 'sesionCaducada', causa: 'HTTP 401' });
    expect(ctx.llamadas.crear).toBe(1);
    expect(ctx.retardos).toEqual([]);
    expect(eventosDe(ctx, 'advertencia')).toHaveLength(0);
    const errores = eventosDe(ctx, 'error');
    expect(errores).toHaveLength(1);
    expect(errores[0].campos).toEqual({ causa: 'HTTP 401' });
    expect(ctx.traza).toEqual(['sesion', 'listar', 'canal', 'info', 'crear', 'error']);
  });

  it('403 produce PermisosInsuficientes con error final de causa depurada y sin reintentos', async () => {
    const ctx = crearContexto(() => new ErrorApiPrueba(403));

    const resultado = await crearPlaylistVacia(ctx.solicitud, ctx.dependencias);

    expect(resultado).toEqual({ resultado: 'permisosInsuficientes', causa: 'HTTP 403' });
    expect(ctx.llamadas.crear).toBe(1);
    expect(ctx.retardos).toEqual([]);
    expect(eventosDe(ctx, 'advertencia')).toHaveLength(0);
    const errores = eventosDe(ctx, 'error');
    expect(errores).toHaveLength(1);
    expect(errores[0].campos).toEqual({ causa: 'HTTP 403' });
  });

  it('fallo genérico estructurado (500) y error no estructurado producen FalloInesperado sin reintentos', async () => {
    const estructurado = crearContexto(() => new ErrorApiPrueba(500));
    const noEstructurado = crearContexto(() => new Error('fallo de red'));

    expect(await crearPlaylistVacia(estructurado.solicitud, estructurado.dependencias)).toEqual({
      resultado: 'falloInesperado',
      causa: 'HTTP 500',
    });
    expect(await crearPlaylistVacia(noEstructurado.solicitud, noEstructurado.dependencias)).toEqual(
      { resultado: 'falloInesperado', causa: 'fallo de red' }
    );

    for (const ctx of [estructurado, noEstructurado]) {
      expect(ctx.llamadas.crear).toBe(1);
      expect(ctx.retardos).toEqual([]);
      expect(eventosDe(ctx, 'advertencia')).toHaveLength(0);
      expect(eventosDe(ctx, 'error')).toHaveLength(1);
    }
  });

  it('la causa depurada y los registros no exponen testigos, cabeceras ni cuerpos (RNF-001, AC-004)', async () => {
    const ctx = crearContexto(() => new ErrorApiPrueba(401, CAUSA_SENSIBLE));

    const resultado = await crearPlaylistVacia(ctx.solicitud, ctx.dependencias);

    expect(resultado.resultado).toBe('sesionCaducada');
    const serializado = JSON.stringify(ctx.eventos);
    for (const patron of PATRONES_SENSIBLES) {
      expect(serializado, `el registro no debe contener ${patron}`).not.toMatch(patron);
    }
    if ('causa' in resultado) {
      for (const patron of PATRONES_SENSIBLES) {
        expect(resultado.causa, `la causa no debe contener ${patron}`).not.toMatch(patron);
      }
    }
    const camposPermitidos = [
      'nombre',
      'visibilidad',
      'descripcionEfectiva',
      'identificador',
      'intento',
      'estado',
      'causa',
    ];
    for (const evento of ctx.eventos) {
      for (const clave of Object.keys(evento.campos ?? {})) {
        expect(camposPermitidos).toContain(clave);
      }
    }
  });
});
