/**
 * TC-010 a TC-013 — Caso de uso `crearPlaylistVacia` (TASK-008).
 *
 * Trazabilidad:
 * - TC-010: `OBJ-001 → RF-001, RNF-006 → UC-001 → AC-001 → TASK-008 → TC-010`.
 * - TC-011: `OBJ-001 → RF-001, RF-002 → UC-001-E1, UC-001-E3 → AC-004, AC-005 →
 *   TASK-008 → TC-011`.
 * - TC-012: `OBJ-001 → RF-001, RNF-006 → UC-001-A1 → AC-005 → TASK-008 → TC-012`.
 * - TC-013: `OBJ-001 → RF-002, RNF-006 → UC-001 → AC-003, AC-005 → TASK-008 → TC-013`.
 *
 * Pruebas de unidad con dobles de los cuatro puertos y del canal de confirmación
 * inyectado en la solicitud (DISC-002): sin red, sin disco y sin terminal
 * (RNF-003, RNF-005). El orden aprobado del flujo es sesión → validación →
 * listado/duplicados → confirmación → `info` de inicio → creación → `info` de éxito.
 */
import { readFileSync } from 'node:fs';
import { crearPlaylistVacia } from '@/business/playlists/crear-playlist.js';
import type { CamposRegistro, DependenciasCreacion } from '@/business/playlists/puertos.js';
import type { SesionVigente, SolicitudCreacion } from '@/business/playlists/types.js';
import { describe, expect, it } from 'vitest';

const RUTA_CASO_USO = 'src/business/playlists/crear-playlist.ts';

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
  { descripcion: 'acceso a argv o readline', patron: /\b(argv|readline)\b/ },
];

/** Evento observado en el doble de `RegistroTecnico`. */
interface Evento {
  readonly tipo: 'info' | 'advertencia' | 'error';
  readonly mensaje: string;
  readonly campos?: CamposRegistro;
}

/** Opciones de los dobles; los valores por defecto describen un flujo feliz. */
interface OpcionesDobles {
  readonly nombre?: string;
  readonly descripcion?: string;
  readonly visibilidad?: SolicitudCreacion['visibilidad'];
  readonly sesion?: SesionVigente | null;
  readonly propias?: readonly string[];
  readonly respuestaCanal?: 'confirmada' | 'cancelada';
  readonly duplicadoAceptado?: boolean;
}

/** Contexto de prueba: solicitud, dependencias dobladas y trazas observables. */
interface Contexto {
  readonly solicitud: SolicitudCreacion;
  readonly dependencias: DependenciasCreacion;
  /** Secuencia de efectos en orden de ejecución. */
  readonly traza: string[];
  readonly eventos: Evento[];
  readonly llamadas: { listar: number; crear: number; canal: number };
}

const IDENTIFICADOR = 'id-001';
const ENLACE = 'https://open.spotify.com/playlist/id-001';
const TESTIGO_SESION = 'testigo-ficticio';

function crearContexto(opciones: OpcionesDobles = {}): Contexto {
  const traza: string[] = [];
  const eventos: Evento[] = [];
  const llamadas = { listar: 0, crear: 0, canal: 0 };

  const registrar = (tipo: Evento['tipo']) => (mensaje: string, campos?: CamposRegistro) => {
    traza.push(tipo);
    eventos.push(campos === undefined ? { tipo, mensaje } : { tipo, mensaje, campos });
  };

  const solicitud: SolicitudCreacion = {
    nombre: opciones.nombre ?? 'Viaje 2026',
    descripcion: opciones.descripcion,
    visibilidad: opciones.visibilidad ?? 'privada',
    duplicadoAceptado: opciones.duplicadoAceptado,
    canalConfirmacion: async () => {
      traza.push('canal');
      llamadas.canal += 1;
      return opciones.respuestaCanal ?? 'confirmada';
    },
  };

  const dependencias: DependenciasCreacion = {
    sesionProveedor: {
      obtenerSesionVigente: async () => {
        traza.push('sesion');
        if (opciones.sesion === undefined) {
          return { testigoSesion: TESTIGO_SESION };
        }
        return opciones.sesion;
      },
    },
    playlistGateway: {
      listarPlaylistsPropias: async () => {
        traza.push('listar');
        llamadas.listar += 1;
        return [...(opciones.propias ?? [])];
      },
      crearPlaylist: async () => {
        traza.push('crear');
        llamadas.crear += 1;
        return { identificador: IDENTIFICADOR, enlace: ENLACE };
      },
    },
    registroTecnico: {
      info: registrar('info'),
      advertencia: registrar('advertencia'),
      error: registrar('error'),
    },
    espera: { esperar: async () => {} },
  };

  return { solicitud, dependencias, traza, eventos, llamadas };
}

function leerFuente(ruta: string): string {
  return readFileSync(new URL(`../../../${ruta}`, import.meta.url), 'utf8');
}

describe('TC-010 canal de confirmación y orden del flujo (TASK-008)', () => {
  it('invoca el canal tras validación y duplicados y antes de crear; con confirmada produce Exito con infos en orden', async () => {
    const ctx = crearContexto({ descripcion: 'Carretera' });

    const resultado = await crearPlaylistVacia(ctx.solicitud, ctx.dependencias);

    expect(resultado).toEqual({
      resultado: 'exito',
      nombreEfectivo: 'Viaje 2026',
      visibilidad: 'privada',
      descripcionEfectiva: 'Carretera',
      identificador: IDENTIFICADOR,
      enlace: ENLACE,
    });
    expect(ctx.llamadas.canal).toBe(1);
    expect(ctx.llamadas.crear).toBe(1);
    // Orden exigido: sesión → validación → listado → canal → info de inicio →
    // creación → info de éxito (el canal queda después de los duplicados y
    // antes de crear; el `info` de inicio solo después de confirmar).
    expect(ctx.traza).toEqual(['sesion', 'listar', 'canal', 'info', 'crear', 'info']);
    const primeraInfo = ctx.traza.indexOf('info');
    const ultimaInfo = ctx.traza.lastIndexOf('info');
    expect(ctx.traza.indexOf('canal')).toBeLessThan(primeraInfo);
    expect(primeraInfo).toBeLessThan(ctx.traza.indexOf('crear'));
    expect(ctx.traza.indexOf('crear')).toBeLessThan(ultimaInfo);
  });

  it('el info de inicio lleva nombre, visibilidad y descripción efectiva, y el de éxito añade identificador (RNF-006)', async () => {
    const ctx = crearContexto({ descripcion: 'Carretera' });

    await crearPlaylistVacia(ctx.solicitud, ctx.dependencias);

    expect(ctx.eventos).toHaveLength(2);
    expect(ctx.eventos[0]).toEqual({
      tipo: 'info',
      mensaje: expect.any(String),
      campos: {
        nombre: 'Viaje 2026',
        visibilidad: 'privada',
        descripcionEfectiva: 'Carretera',
      },
    });
    expect(ctx.eventos[1]).toEqual({
      tipo: 'info',
      mensaje: expect.any(String),
      campos: {
        nombre: 'Viaje 2026',
        visibilidad: 'privada',
        descripcionEfectiva: 'Carretera',
        identificador: IDENTIFICADOR,
      },
    });
  });

  it('con duplicadoAceptado:true omite la comprobación resuelta, sin advertencia, y continúa a confirmación, creación y éxito (UC-001-A1 4/5)', async () => {
    const ctx = crearContexto({ propias: ['Viaje 2026'], duplicadoAceptado: true });

    const resultado = await crearPlaylistVacia(ctx.solicitud, ctx.dependencias);

    expect(resultado.resultado).toBe('exito');
    expect(ctx.llamadas.listar).toBe(0);
    expect(ctx.llamadas.canal).toBe(1);
    expect(ctx.llamadas.crear).toBe(1);
    expect(ctx.eventos.filter((evento) => evento.tipo === 'advertencia')).toHaveLength(0);
    expect(ctx.traza).toEqual(['sesion', 'canal', 'info', 'crear', 'info']);
  });
});

describe('TC-011 sin sesión y validación sin listar ni crear (TASK-008)', () => {
  it('sin sesión vigente devuelve SinSesion sin invocar el gateway ni el canal (BR-001)', async () => {
    const ctx = crearContexto({ sesion: null });

    const resultado = await crearPlaylistVacia(ctx.solicitud, ctx.dependencias);

    expect(resultado).toEqual({ resultado: 'sinSesion' });
    expect(ctx.llamadas.listar).toBe(0);
    expect(ctx.llamadas.crear).toBe(0);
    expect(ctx.llamadas.canal).toBe(0);
    expect(ctx.eventos).toHaveLength(0);
    expect(ctx.traza).toEqual(['sesion']);
  });

  it('con nombre de longitud inválida devuelve ErrorValidacion de nombre sin listar, sin crear y sin invocar el canal (BR-004)', async () => {
    const ctx = crearContexto({ nombre: 'ab' });

    const resultado = await crearPlaylistVacia(ctx.solicitud, ctx.dependencias);

    expect(resultado).toEqual({ resultado: 'errorValidacion', campo: 'nombre' });
    expect(ctx.llamadas.listar).toBe(0);
    expect(ctx.llamadas.crear).toBe(0);
    expect(ctx.llamadas.canal).toBe(0);
    expect(ctx.eventos).toHaveLength(0);
    expect(ctx.traza).toEqual(['sesion']);
  });

  it('con nombre vacío o solo espacios devuelve ErrorValidacion de nombre (BR-004)', async () => {
    const vacio = crearContexto({ nombre: '   ' });
    const espacios = crearContexto({ nombre: '' });

    expect(await crearPlaylistVacia(vacio.solicitud, vacio.dependencias)).toEqual({
      resultado: 'errorValidacion',
      campo: 'nombre',
    });
    expect(await crearPlaylistVacia(espacios.solicitud, espacios.dependencias)).toEqual({
      resultado: 'errorValidacion',
      campo: 'nombre',
    });
    expect(vacio.llamadas.listar + espacios.llamadas.listar).toBe(0);
    expect(vacio.llamadas.crear + espacios.llamadas.crear).toBe(0);
  });

  it('con visibilidad ausente o doble devuelve ErrorValidacion de visibilidad sin listar ni crear (BR-005)', async () => {
    const ausente = crearContexto({ visibilidad: 'ausente' });
    const doble = crearContexto({ visibilidad: 'doble' });

    expect(await crearPlaylistVacia(ausente.solicitud, ausente.dependencias)).toEqual({
      resultado: 'errorValidacion',
      campo: 'visibilidad',
    });
    expect(await crearPlaylistVacia(doble.solicitud, doble.dependencias)).toEqual({
      resultado: 'errorValidacion',
      campo: 'visibilidad',
    });
    for (const ctx of [ausente, doble]) {
      expect(ctx.llamadas.listar).toBe(0);
      expect(ctx.llamadas.crear).toBe(0);
      expect(ctx.llamadas.canal).toBe(0);
      expect(ctx.eventos).toHaveLength(0);
    }
  });
});

describe('TC-012 duplicado con advertencia y sin crear (TASK-008)', () => {
  it('devuelve Duplicado con el nombre efectivo, emite advertencia con el nombre y no crea (BR-006, RNF-006)', async () => {
    const ctx = crearContexto({ nombre: '  Viaje 2026 ', propias: ['Viaje 2026'] });

    const resultado = await crearPlaylistVacia(ctx.solicitud, ctx.dependencias);

    expect(resultado).toEqual({ resultado: 'duplicado', nombreEfectivo: 'Viaje 2026' });
    expect(ctx.llamadas.crear).toBe(0);
    expect(ctx.llamadas.canal).toBe(0);
    expect(ctx.eventos).toEqual([
      {
        tipo: 'advertencia',
        mensaje: expect.any(String),
        campos: { nombre: 'Viaje 2026' },
      },
    ]);
    expect(ctx.traza).toEqual(['sesion', 'listar', 'advertencia']);
  });

  it('con lista de propias sin coincidencia no advierte y continúa al canal', async () => {
    const ctx = crearContexto({ propias: ['Música'] });

    const resultado = await crearPlaylistVacia(ctx.solicitud, ctx.dependencias);

    expect(resultado.resultado).toBe('exito');
    expect(ctx.eventos.filter((evento) => evento.tipo === 'advertencia')).toHaveLength(0);
    expect(ctx.traza).toEqual(['sesion', 'listar', 'canal', 'info', 'crear', 'info']);
  });
});

describe('TC-013 cancelación por el canal sin crear ni registrar (TASK-008)', () => {
  it('con canal cancelada devuelve Cancelado, sin crear y sin ningún evento (BR-007, RNF-006)', async () => {
    const ctx = crearContexto({ respuestaCanal: 'cancelada' });

    const resultado = await crearPlaylistVacia(ctx.solicitud, ctx.dependencias);

    expect(resultado).toEqual({ resultado: 'cancelado' });
    expect(ctx.llamadas.canal).toBe(1);
    expect(ctx.llamadas.crear).toBe(0);
    expect(ctx.eventos).toHaveLength(0);
    expect(ctx.traza).toEqual(['sesion', 'listar', 'canal']);
  });

  it('también con duplicadoAceptado:true y canal cancelada: Cancelado, sin crear y sin eventos', async () => {
    const ctx = crearContexto({
      respuestaCanal: 'cancelada',
      duplicadoAceptado: true,
      propias: ['Viaje 2026'],
    });

    const resultado = await crearPlaylistVacia(ctx.solicitud, ctx.dependencias);

    expect(resultado).toEqual({ resultado: 'cancelado' });
    expect(ctx.llamadas.crear).toBe(0);
    expect(ctx.eventos).toHaveLength(0);
    expect(ctx.traza).toEqual(['sesion', 'canal']);
  });
});

describe('TC-010 a TC-013 capas y pureza del caso de uso (RNF-003, RNF-005)', () => {
  it('el módulo no contiene any ni efectos directos de red, ficheros, terminal ni Presentation', () => {
    const fuente = leerFuente(RUTA_CASO_USO);
    for (const { descripcion, patron } of PATRONES_PROHIBIDOS) {
      expect(fuente, `${RUTA_CASO_USO} no debe contener ${descripcion}`).not.toMatch(patron);
    }
  });
});
