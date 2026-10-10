/**
 * TC-020 — Coordinador del flujo de creación de playlist vacía (TASK-014).
 *
 * Trazabilidad: `DISC-002 → OBJ-001 → RF-001, RF-002, RNF-002 → UC-001,
 * UC-001-A1, UC-001-E1, UC-001-E2, UC-001-E3 → AC-001, AC-003, AC-004,
 * AC-005 → TASK-014 → TC-020`.
 *
 * Unidad con dobles del caso de uso y de las peticiones: el coordinador
 * presenta el literal exacto de cada desenlace con `MESSAGES` (TASK-011),
 * gestiona el reingreso de longitud, el menú de duplicados `1/2/0` y la
 * confirmación `(s/N): ` a través del canal inyectado, y traduce `Cancelado`
 * sin registrar ni añadir literales (RNF-002, RNF-003, BR-006, BR-007).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ResultadoCreacion, SolicitudCreacion } from '@/business/playlists/types.js';
import type { CasoUsoCrearPlaylist } from '@/presentation/composicion-crear-playlist.js';
import type {
  CoordinadorCreacion,
  EntradaDirecta,
  PeticionesCreacion,
} from '@/presentation/crear-playlist.js';
import { ejecutarFlujoCreacion, peticionesDeTerminal } from '@/presentation/crear-playlist.js';
import { MESSAGES } from '@/presentation/messages.js';
import type {
  EleccionDuplicados,
  EleccionVisibilidad,
  EntradaPrompt,
  OpcionDuplicados,
  ResumenCreacion,
} from '@/presentation/prompts.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));

/** Éxito programado del doble de caso de uso. */
const EXITO = {
  resultado: 'exito',
  nombreEfectivo: 'Viaje 2026',
  visibilidad: 'privada',
  descripcionEfectiva: 'Carretera',
  identificador: 'pl-tc020',
  enlace: 'https://open.spotify.com/playlist/pl-tc020',
} as const satisfies ResultadoCreacion;

/** Literal aprobado de éxito que el coordinador debe presentar (RNF-002). */
const LITERAL_EXITO =
  'Playlist creada: "Viaje 2026" (privada, descripción: "Carretera", id: pl-tc020, ' +
  'enlace: https://open.spotify.com/playlist/pl-tc020)';

const DUPLICADO = { resultado: 'duplicado', nombreEfectivo: 'Viaje 2026' } as const;

type Respuesta = string | 'ctrl+c';
type VisibilidadProgramada = '' | '1' | '2' | 'ctrl+c';
type OpcionProgramada = OpcionDuplicados | 'ctrl+c';

interface DoblesPeticiones {
  readonly peticiones: PeticionesCreacion;
  readonly llamadas: string[];
  readonly resumenes: (ResumenCreacion | undefined)[];
  readonly respuestas: {
    readonly nombre: Respuesta[];
    readonly descripcion: Respuesta[];
    readonly visibilidad: VisibilidadProgramada[];
    readonly confirmacion: Respuesta[];
    readonly duplicados: OpcionProgramada[];
    readonly modificacion: Respuesta[];
  };
}

/** Doble de las peticiones: registra qué se pidió y consume respuestas programadas. */
function crearDoblesPeticiones(): DoblesPeticiones {
  const llamadas: string[] = [];
  const resumenes: (ResumenCreacion | undefined)[] = [];
  const respuestas = {
    nombre: [] as Respuesta[],
    descripcion: [] as Respuesta[],
    visibilidad: [] as VisibilidadProgramada[],
    confirmacion: [] as Respuesta[],
    duplicados: [] as OpcionProgramada[],
    modificacion: [] as Respuesta[],
  };

  const pedir = async (etiqueta: string, cola: Respuesta[]): Promise<EntradaPrompt> => {
    llamadas.push(etiqueta);
    const respuesta = cola.shift();
    if (respuesta === undefined) {
      throw new Error(`Doble de peticiones sin respuesta programada para «${etiqueta}».`);
    }
    if (respuesta === 'ctrl+c') {
      return { estado: 'abortado' };
    }
    return { estado: 'respondido', valor: respuesta };
  };

  const peticiones: PeticionesCreacion = {
    nombre: () => pedir('nombre', respuestas.nombre),
    descripcion: () => pedir('descripcion', respuestas.descripcion),
    async visibilidad() {
      llamadas.push('visibilidad');
      const respuesta = respuestas.visibilidad.shift();
      if (respuesta === undefined) {
        throw new Error('Doble de peticiones sin respuesta programada para «visibilidad».');
      }
      if (respuesta === 'ctrl+c') {
        return { estado: 'abortado' };
      }
      const eleccion: EleccionVisibilidad =
        respuesta === '2'
          ? { estado: 'seleccionada', visibilidad: 'privada' }
          : { estado: 'seleccionada', visibilidad: 'publica' };
      return eleccion;
    },
    confirmacion: (resumen) => {
      resumenes.push(resumen);
      return pedir('confirmacion', respuestas.confirmacion);
    },
    async opcionDuplicados() {
      llamadas.push('duplicados');
      const respuesta = respuestas.duplicados.shift();
      if (respuesta === undefined) {
        throw new Error('Doble de peticiones sin respuesta programada para «duplicados».');
      }
      if (respuesta === 'ctrl+c') {
        return { estado: 'abortado' };
      }
      const eleccion: EleccionDuplicados = { estado: 'elegida', opcion: respuesta };
      return eleccion;
    },
    modificacion: () => pedir('modificacion', respuestas.modificacion),
  };

  return { peticiones, llamadas, resumenes, respuestas };
}

type ComportamientoCasoUso = ResultadoCreacion | 'invocarCanal';

interface DobleCasoUso {
  readonly casoUso: CasoUsoCrearPlaylist;
  readonly invocaciones: SolicitudCreacion[];
}

/**
 * Doble del caso de uso: registra las solicitudes y ejecuta el comportamiento
 * programado; `invocarCanal` simula a Business invocando el canal de
 * confirmación (DISC-002) y devuelve éxito o `Cancelado` según su desenlace.
 */
function crearDobleCasoUso(comportamientos: readonly ComportamientoCasoUso[]): DobleCasoUso {
  const invocaciones: SolicitudCreacion[] = [];
  const cola = [...comportamientos];
  const casoUso: CasoUsoCrearPlaylist = async (solicitud) => {
    invocaciones.push(solicitud);
    const comportamiento = cola.shift();
    if (comportamiento === undefined) {
      throw new Error('Doble de caso de uso sin comportamiento programado.');
    }
    if (comportamiento === 'invocarCanal') {
      const desenlace = await solicitud.canalConfirmacion();
      return desenlace === 'cancelada' ? { resultado: 'cancelado' } : EXITO;
    }
    return comportamiento;
  };
  return { casoUso, invocaciones };
}

interface FlujoPreparado {
  readonly coordinador: CoordinadorCreacion;
  readonly invocaciones: SolicitudCreacion[];
  readonly llamadas: string[];
  readonly resumenes: DoblesPeticiones['resumenes'];
  readonly respuestas: DoblesPeticiones['respuestas'];
}

function prepararFlujo(
  comportamientos: readonly ComportamientoCasoUso[],
  entradaDirecta?: EntradaDirecta
): FlujoPreparado {
  const dobleCasoUso = crearDobleCasoUso(comportamientos);
  const dobles = crearDoblesPeticiones();
  const coordinador: CoordinadorCreacion = {
    casoUso: dobleCasoUso.casoUso,
    peticiones: dobles.peticiones,
    entradaDirecta,
  };
  return {
    coordinador,
    invocaciones: dobleCasoUso.invocaciones,
    llamadas: dobles.llamadas,
    resumenes: dobles.resumenes,
    respuestas: dobles.respuestas,
  };
}

/** Programa las tres peticiones del flujo de menú (UC-001 paso 3). */
function programarMenuInicial(flujo: FlujoPreparado): void {
  flujo.respuestas.nombre.push('Viaje 2026');
  flujo.respuestas.descripcion.push('Carretera');
  flujo.respuestas.visibilidad.push('');
}

interface CasoError {
  readonly etiqueta: string;
  readonly resultado: ResultadoCreacion;
  readonly literal: string;
}

const CASOS_ERROR: readonly CasoError[] = [
  {
    etiqueta: 'sinSesion (UC-001-E1)',
    resultado: { resultado: 'sinSesion' },
    literal: MESSAGES.playlist.noSessionError,
  },
  {
    etiqueta: 'sesionCaducada (401)',
    resultado: { resultado: 'sesionCaducada', causa: '401' },
    literal: MESSAGES.playlist.sessionExpiredError,
  },
  {
    etiqueta: 'permisosInsuficientes (403)',
    resultado: { resultado: 'permisosInsuficientes', causa: '403' },
    literal: MESSAGES.playlist.permissionsError,
  },
  {
    etiqueta: 'limiteAgotado (429 persistente)',
    resultado: { resultado: 'limiteAgotado', causa: '429' },
    literal: MESSAGES.playlist.rateLimitError,
  },
  {
    etiqueta: 'falloInesperado',
    resultado: { resultado: 'falloInesperado', causa: 'fallo simulado' },
    literal: MESSAGES.playlist.unexpectedError,
  },
  {
    etiqueta: 'errorValidacion de visibilidad',
    resultado: { resultado: 'errorValidacion', campo: 'visibilidad' },
    literal: MESSAGES.playlist.visibilityFlagError,
  },
];

let salida = '';

describe('TC-020 — Coordinador del flujo de creación (TASK-014)', () => {
  beforeEach(() => {
    salida = '';
    vi.spyOn(process.stdout, 'write').mockImplementation((fragmento: string | Uint8Array) => {
      salida += typeof fragmento === 'string' ? fragmento : '';
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('presenta el mensaje único de éxito con identificador y enlace tras confirmar en el canal (AC-001)', async () => {
    const flujo = prepararFlujo(['invocarCanal']);
    programarMenuInicial(flujo);
    flujo.respuestas.confirmacion.push('s');

    const finalizacion = await ejecutarFlujoCreacion(flujo.coordinador);

    expect(finalizacion).toEqual({ estado: 'creada' });
    expect(salida).toContain(LITERAL_EXITO);
    expect(flujo.llamadas).toEqual(['nombre', 'descripcion', 'visibilidad', 'confirmacion']);
    expect(flujo.invocaciones).toHaveLength(1);
    expect(flujo.invocaciones[0]).toMatchObject({
      nombre: 'Viaje 2026',
      descripcion: 'Carretera',
      visibilidad: 'publica',
    });
    expect(flujo.invocaciones[0]).not.toHaveProperty('duplicadoAceptado');
  });

  for (const caso of CASOS_ERROR) {
    it(`presenta el literal exacto de ${caso.etiqueta} (AC-004)`, async () => {
      const flujo = prepararFlujo([caso.resultado]);
      programarMenuInicial(flujo);

      const finalizacion = await ejecutarFlujoCreacion(flujo.coordinador);

      expect(finalizacion).toEqual({ estado: 'error' });
      expect(salida).toContain(caso.literal);
      expect(flujo.invocaciones).toHaveLength(1);
    });
  }

  it('ErrorValidacion de longitud repite la petición de nombre tras mostrar el literal (UC-001-E3)', async () => {
    const flujo = prepararFlujo([{ resultado: 'errorValidacion', campo: 'nombre' }, EXITO]);
    programarMenuInicial(flujo);
    flujo.respuestas.nombre.push('Viaje Nuevo');

    const finalizacion = await ejecutarFlujoCreacion(flujo.coordinador);

    expect(finalizacion).toEqual({ estado: 'creada' });
    expect(salida).toContain(MESSAGES.playlist.nameLengthError);
    expect(salida).toContain(LITERAL_EXITO);
    expect(flujo.llamadas).toEqual(['nombre', 'descripcion', 'visibilidad', 'nombre']);
    expect(flujo.invocaciones).toHaveLength(2);
    expect(flujo.invocaciones[1]).toMatchObject({
      nombre: 'Viaje Nuevo',
      descripcion: 'Carretera',
      visibilidad: 'publica',
    });
    expect(flujo.invocaciones[1]).not.toHaveProperty('duplicadoAceptado');
  });

  it('el comando directo válido sin reingreso usa el canal pre-resuelto en confirmada (P-001, N-001)', async () => {
    const flujo = prepararFlujo(['invocarCanal'], {
      nombre: 'Viaje 2026',
      descripcion: 'Carretera',
      visibilidad: 'privada',
      confirmacionPreResuelta: true,
    });

    const finalizacion = await ejecutarFlujoCreacion(flujo.coordinador);

    expect(finalizacion).toEqual({ estado: 'creada' });
    expect(salida).toContain(LITERAL_EXITO);
    expect(flujo.llamadas).toEqual([]);
    expect(flujo.invocaciones[0]).toMatchObject({
      nombre: 'Viaje 2026',
      descripcion: 'Carretera',
      visibilidad: 'privada',
    });
  });

  it('tras el reingreso de nombre del comando directo la confirmación se solicita por el canal', async () => {
    const flujo = prepararFlujo(
      [{ resultado: 'errorValidacion', campo: 'nombre' }, 'invocarCanal'],
      {
        nombre: 'Viaje 2026',
        descripcion: 'Carretera',
        visibilidad: 'privada',
        confirmacionPreResuelta: true,
      }
    );
    flujo.respuestas.nombre.push('Viaje Nuevo');
    flujo.respuestas.confirmacion.push('s');

    const finalizacion = await ejecutarFlujoCreacion(flujo.coordinador);

    expect(finalizacion).toEqual({ estado: 'creada' });
    expect(salida).toContain(MESSAGES.playlist.nameLengthError);
    expect(flujo.llamadas).toEqual(['nombre', 'confirmacion']);
    expect(flujo.invocaciones[1]).toMatchObject({ nombre: 'Viaje Nuevo' });
  });

  it('ErrorValidacion de visibilidad muestra su literal y no continúa hasta corregir la invocación', async () => {
    const flujo = prepararFlujo([{ resultado: 'errorValidacion', campo: 'visibilidad' }], {
      nombre: 'Viaje 2026',
      visibilidad: 'ausente',
      confirmacionPreResuelta: true,
    });

    const finalizacion = await ejecutarFlujoCreacion(flujo.coordinador);

    expect(finalizacion).toEqual({ estado: 'error' });
    expect(salida).toContain(MESSAGES.playlist.visibilityFlagError);
    expect(flujo.llamadas).toEqual([]);
    expect(flujo.invocaciones).toHaveLength(1);
  });

  describe('menú de duplicados 1/2/0 (UC-001-A1, BR-006)', () => {
    it('muestra el literal del duplicado y, con 1, repite el nombre y pregunta modificación sin duplicadoAceptado', async () => {
      const flujo = prepararFlujo([DUPLICADO, EXITO]);
      programarMenuInicial(flujo);
      flujo.respuestas.duplicados.push('1');
      flujo.respuestas.nombre.push('Viaje Nuevo');
      flujo.respuestas.modificacion.push('N');

      const finalizacion = await ejecutarFlujoCreacion(flujo.coordinador);

      expect(finalizacion).toEqual({ estado: 'creada' });
      expect(salida).toContain(MESSAGES.playlist.duplicate('Viaje 2026'));
      expect(flujo.llamadas).toEqual([
        'nombre',
        'descripcion',
        'visibilidad',
        'duplicados',
        'nombre',
        'modificacion',
      ]);
      expect(flujo.invocaciones).toHaveLength(2);
      expect(flujo.invocaciones[1]).toMatchObject({
        nombre: 'Viaje Nuevo',
        descripcion: 'Carretera',
        visibilidad: 'publica',
      });
      expect(flujo.invocaciones[1]).not.toHaveProperty('duplicadoAceptado');
    });

    it('con 1 y "s" repite también descripción y visibilidad antes de reinvocar', async () => {
      const flujo = prepararFlujo([DUPLICADO, EXITO]);
      programarMenuInicial(flujo);
      flujo.respuestas.duplicados.push('1');
      flujo.respuestas.nombre.push('Viaje Nuevo');
      flujo.respuestas.modificacion.push('s');
      flujo.respuestas.descripcion.push('Ruta');
      flujo.respuestas.visibilidad.push('2');

      const finalizacion = await ejecutarFlujoCreacion(flujo.coordinador);

      expect(finalizacion).toEqual({ estado: 'creada' });
      expect(flujo.llamadas).toEqual([
        'nombre',
        'descripcion',
        'visibilidad',
        'duplicados',
        'nombre',
        'modificacion',
        'descripcion',
        'visibilidad',
      ]);
      expect(flujo.invocaciones[1]).toMatchObject({
        nombre: 'Viaje Nuevo',
        descripcion: 'Ruta',
        visibilidad: 'privada',
      });
      expect(flujo.invocaciones[1]).not.toHaveProperty('duplicadoAceptado');
    });

    it('con 2 reinvoca con duplicadoAceptado y la confirmación va por el canal inyectado', async () => {
      const flujo = prepararFlujo([DUPLICADO, 'invocarCanal']);
      programarMenuInicial(flujo);
      flujo.respuestas.duplicados.push('2');
      flujo.respuestas.confirmacion.push('s');

      const finalizacion = await ejecutarFlujoCreacion(flujo.coordinador);

      expect(finalizacion).toEqual({ estado: 'creada' });
      expect(salida).toContain(LITERAL_EXITO);
      expect(flujo.llamadas).toEqual([
        'nombre',
        'descripcion',
        'visibilidad',
        'duplicados',
        'confirmacion',
      ]);
      expect(flujo.invocaciones[0]).not.toHaveProperty('duplicadoAceptado');
      expect(flujo.invocaciones[1].duplicadoAceptado).toBe(true);
    });

    it('con 2 y confirmación "N" el canal devuelve cancelada y se traduce sin crear ni registrar', async () => {
      const flujo = prepararFlujo([DUPLICADO, 'invocarCanal']);
      programarMenuInicial(flujo);
      flujo.respuestas.duplicados.push('2');
      flujo.respuestas.confirmacion.push('N');

      const finalizacion = await ejecutarFlujoCreacion(flujo.coordinador);

      expect(finalizacion).toEqual({ estado: 'cancelada' });
      expect(flujo.invocaciones).toHaveLength(2);
      expect(salida).not.toContain('Playlist creada:');
      expect(salida).not.toContain(MESSAGES.playlist.cancelled);
    });

    it('con 0 muestra la cancelación sin invocar el caso de uso ni añadir registro', async () => {
      const flujo = prepararFlujo([DUPLICADO]);
      programarMenuInicial(flujo);
      flujo.respuestas.duplicados.push('0');

      const finalizacion = await ejecutarFlujoCreacion(flujo.coordinador);

      expect(finalizacion).toEqual({ estado: 'cancelada' });
      expect(salida).toContain(MESSAGES.playlist.duplicate('Viaje 2026'));
      expect(salida).toContain(MESSAGES.playlist.cancelled);
      expect(flujo.invocaciones).toHaveLength(1);
    });

    it('Ctrl+C en el menú de duplicados aborta sin mostrar la cancelación literal', async () => {
      const flujo = prepararFlujo([DUPLICADO]);
      programarMenuInicial(flujo);
      flujo.respuestas.duplicados.push('ctrl+c');

      const finalizacion = await ejecutarFlujoCreacion(flujo.coordinador);

      expect(finalizacion).toEqual({ estado: 'cancelada' });
      expect(flujo.invocaciones).toHaveLength(1);
      expect(salida).not.toContain(MESSAGES.playlist.cancelled);
    });
  });

  describe('confirmación final (s/N) por el canal inyectado (BR-007)', () => {
    for (const respuesta of ['N', 'S', '', 'Si'] as const) {
      it(`la respuesta «${respuesta === '' ? '(vacía)' : respuesta}» cancela sin crear ni registrar`, async () => {
        const flujo = prepararFlujo(['invocarCanal']);
        programarMenuInicial(flujo);
        flujo.respuestas.confirmacion.push(respuesta);

        const finalizacion = await ejecutarFlujoCreacion(flujo.coordinador);

        expect(finalizacion).toEqual({ estado: 'cancelada' });
        expect(flujo.invocaciones).toHaveLength(1);
        expect(salida).not.toContain('Playlist creada:');
        expect(salida).not.toContain(MESSAGES.playlist.cancelled);
      });
    }

    it('Ctrl+C durante la confirmación cancela la creación sin crear ni registrar', async () => {
      const flujo = prepararFlujo(['invocarCanal']);
      programarMenuInicial(flujo);
      flujo.respuestas.confirmacion.push('ctrl+c');

      const finalizacion = await ejecutarFlujoCreacion(flujo.coordinador);

      expect(finalizacion).toEqual({ estado: 'cancelada' });
      expect(flujo.invocaciones).toHaveLength(1);
      expect(salida).not.toContain('Playlist creada:');
      expect(salida).not.toContain(MESSAGES.playlist.cancelled);
    });
  });

  describe('resumen previo a la confirmación (DISC-006)', () => {
    it('pasa el resumen del flujo de menú con nombre, visibilidad y descripción efectivos', async () => {
      const flujo = prepararFlujo(['invocarCanal']);
      programarMenuInicial(flujo);
      flujo.respuestas.confirmacion.push('s');

      const finalizacion = await ejecutarFlujoCreacion(flujo.coordinador);

      expect(finalizacion).toEqual({ estado: 'creada' });
      expect(flujo.resumenes).toEqual([
        {
          nombreEfectivo: 'Viaje 2026',
          visibilidad: 'publica',
          descripcionEfectiva: 'Carretera',
        },
      ]);
    });

    it('recorta el nombre y resuelve la descripción por defecto en el resumen', async () => {
      const flujo = prepararFlujo(['invocarCanal']);
      flujo.respuestas.nombre.push('  Viaje 2026  ');
      flujo.respuestas.descripcion.push('   ');
      flujo.respuestas.visibilidad.push('2');
      flujo.respuestas.confirmacion.push('s');

      const finalizacion = await ejecutarFlujoCreacion(flujo.coordinador);

      expect(finalizacion).toEqual({ estado: 'creada' });
      expect(flujo.resumenes).toEqual([
        {
          nombreEfectivo: 'Viaje 2026',
          visibilidad: 'privada',
          descripcionEfectiva: 'Playlist sin descripción',
        },
      ]);
    });

    it('el comando directo pre-resuelto no pide confirmación y no registra resumen', async () => {
      const flujo = prepararFlujo(['invocarCanal'], {
        nombre: 'Viaje 2026',
        descripcion: 'Carretera',
        visibilidad: 'privada',
        confirmacionPreResuelta: true,
      });

      const finalizacion = await ejecutarFlujoCreacion(flujo.coordinador);

      expect(finalizacion).toEqual({ estado: 'creada' });
      expect(flujo.llamadas).toEqual([]);
      expect(flujo.resumenes).toEqual([]);
    });

    it('con la visibilidad sin resolver la confirmación se pide sin resumen', async () => {
      const flujo = prepararFlujo(['invocarCanal'], {
        nombre: 'Viaje 2026',
        visibilidad: 'ausente',
        confirmacionPreResuelta: false,
      });
      flujo.respuestas.confirmacion.push('s');

      const finalizacion = await ejecutarFlujoCreacion(flujo.coordinador);

      expect(finalizacion).toEqual({ estado: 'creada' });
      expect(flujo.llamadas).toEqual(['confirmacion']);
      expect(flujo.resumenes).toEqual([undefined]);
    });
  });

  it('Cancelado devuelto por Business se traduce en retorno sin registrar ni literales adicionales', async () => {
    const flujo = prepararFlujo([{ resultado: 'cancelado' }]);
    programarMenuInicial(flujo);

    const finalizacion = await ejecutarFlujoCreacion(flujo.coordinador);

    expect(finalizacion).toEqual({ estado: 'cancelada' });
    expect(flujo.invocaciones).toHaveLength(1);
    expect(salida.trim()).toBe('');
  });

  it('Ctrl+C en la petición de nombre del menú aborta sin invocar el caso de uso', async () => {
    const flujo = prepararFlujo([]);
    flujo.respuestas.nombre.push('ctrl+c');

    const finalizacion = await ejecutarFlujoCreacion(flujo.coordinador);

    expect(finalizacion).toEqual({ estado: 'cancelada' });
    expect(flujo.invocaciones).toHaveLength(0);
    expect(salida.trim()).toBe('');
  });

  it('no importa de src/data, no ejecuta efectos directos ni decide reglas de dominio (RNF-003)', () => {
    const fuente = readFileSync(join(RAIZ, 'src', 'presentation', 'crear-playlist.ts'), 'utf8');

    expect(fuente).not.toMatch(/from\s+['"][^'"]*\/data\//);
    expect(fuente).not.toMatch(/node:fs|node:http|\bfetch\s*\(|\bprocess\./);
    // Sin llamadas directas a consola (`./console.js` es el módulo de formato de Presentation).
    expect(fuente).not.toMatch(/\bconsole\.(log|error|warn|info|debug)\s*\(/);
    expect(fuente).not.toMatch(/\bany\b/);
    expect(fuente).not.toMatch(/esLongitudValida|esDuplicadoPropio|withRetry|Retry-After/);
    expect(fuente).not.toMatch(/registroTecnico|RegistroTecnico/);

    // Los literales salen de MESSAGES (TASK-011); el coordinador no los duplica.
    expect(fuente).toContain('MESSAGES.playlist.');
    expect(fuente).not.toContain('Playlist creada: "');
    expect(fuente).not.toContain('Error en longitud del nombre');
    expect(fuente).not.toContain('Ya existe una playlist llamada');
    expect(fuente).not.toContain('Creación cancelada. No se creó ninguna playlist.');
    expect(fuente).not.toContain('Se debe declarar flag único');

    // Las peticiones terminales quedan acopladas a los prompts de TASK-012.
    expect(typeof peticionesDeTerminal.nombre).toBe('function');
    expect(typeof peticionesDeTerminal.descripcion).toBe('function');
    expect(typeof peticionesDeTerminal.visibilidad).toBe('function');
    expect(typeof peticionesDeTerminal.confirmacion).toBe('function');
    expect(typeof peticionesDeTerminal.opcionDuplicados).toBe('function');
    expect(typeof peticionesDeTerminal.modificacion).toBe('function');
  });
});
