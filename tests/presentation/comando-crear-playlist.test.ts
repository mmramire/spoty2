/**
 * TC-021 — Comando directo `spoty create-new-playlist` (TASK-015).
 *
 * Trazabilidad: `OBJ-001 → RF-001, RF-002, RNF-002, RNF-003, RNF-005 →
 * UC-001, UC-001-E3 → AC-002, AC-005 → TASK-015 → TC-021`.
 *
 * Unidad con doble de caso de uso (composición de TASK-013) y doble de
 * `readline` (patrón de TC-018): el comando analiza `--name`, `--description`,
 * `--public` y `--private` sin decidir reglas de dominio, los cuatro ejemplos
 * aprobados inician el flujo con la descripción por defecto cuando falta
 * `--description` (P-001), la visibilidad ausente o doble produce el literal
 * de flag único sin continuar (ARCHITECTURE §6.3), el nombre ausente o fuera
 * de 3-100 produce el literal de longitud y continúa en interactivo con la
 * petición de nombre (UC-001-E3, §6.2) —sí pidiendo confirmación tras el
 * reingreso (N-001)—, y el comando delega en el coordinador TASK-014 con los
 * mismos tipos que la vía de menú (RNF-003). La prueba invoca
 * `handleCommand`, de modo que el alto del comando queda verificado como punto
 * de entrada funcional (AC-002).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  EntradaVisibilidad,
  Exito,
  ResultadoCreacion,
  SolicitudCreacion,
} from '@/business/playlists/types.js';
import { handleCommand } from '@/cli-main.js';
import type { CasoUsoCrearPlaylist } from '@/presentation/composicion-crear-playlist.js';
import { MESSAGES } from '@/presentation/messages.js';
import { closeReadline } from '@/presentation/prompts.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));

const IDENTIFICADOR = 'pl-tc021';
const ENLACE = 'https://open.spotify.com/playlist/pl-tc021';

// Doble de `readline`: registra las peticiones reales de los prompts de
// TASK-012 y consume respuestas programadas, sin terminal real.
const readlineDoble = vi.hoisted(() => ({
  textos: [] as string[],
  respuestas: [] as string[],
}));

vi.mock('node:readline/promises', () => ({
  createInterface: () => ({
    async question(texto: string): Promise<string> {
      readlineDoble.textos.push(texto);
      const respuesta = readlineDoble.respuestas.shift();
      if (respuesta === undefined) {
        throw new Error(`Doble de readline sin respuesta programada para «${texto}».`);
      }
      return respuesta;
    },
    once: () => undefined,
    removeListener: () => undefined,
    close: () => undefined,
  }),
}));

// Doble de la composición de TASK-013: el comando recibe el caso de uso doblado.
const composicionDoble = vi.hoisted(() => ({
  casoUsoActual: undefined as unknown,
}));

vi.mock('@/presentation/composicion-crear-playlist.js', () => ({
  componerCrearPlaylistVacia: () => composicionDoble.casoUsoActual,
}));

/** Éxito del doble de caso de uso para el nombre y la visibilidad del ejemplo. */
function crearExito(
  nombreEfectivo: string,
  visibilidad: Exito['visibilidad'],
  descripcionEfectiva: string
): Exito {
  return {
    resultado: 'exito',
    nombreEfectivo,
    visibilidad,
    descripcionEfectiva,
    identificador: IDENTIFICADOR,
    enlace: ENLACE,
  };
}

/** Literal único de éxito que el coordinador presenta a partir del resultado (P-006). */
function literalExito(exito: Exito): string {
  const visible = exito.visibilidad === 'publica' ? 'pública' : 'privada';
  return (
    `Playlist creada: "${exito.nombreEfectivo}" (${visible}, ` +
    `descripción: "${exito.descripcionEfectiva}", id: ${exito.identificador}, enlace: ${exito.enlace})`
  );
}

type Comportamiento = ResultadoCreacion | 'invocarCanal';

interface DobleCasoUso {
  readonly casoUso: CasoUsoCrearPlaylist;
  readonly invocaciones: SolicitudCreacion[];
}

/**
 * Doble del caso de uso: registra las solicitudes y ejecuta el comportamiento
 * programado; `invocarCanal` simula a Business invocando el canal de
 * confirmación (DISC-002) y devuelve éxito o `Cancelado` según su desenlace.
 */
function crearDobleCasoUso(
  comportamientos: readonly Comportamiento[],
  exito: Exito = crearExito('Viaje 2026', 'privada', 'Playlist sin descripción')
): DobleCasoUso {
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
      return desenlace === 'cancelada' ? { resultado: 'cancelado' } : exito;
    }
    return comportamiento;
  };
  return { casoUso, invocaciones };
}

function instalarCasoUso(doble: DobleCasoUso): void {
  composicionDoble.casoUsoActual = doble.casoUso;
}

/** Invoca el punto de entrada real `handleCommand` con el comando y sus indicadores. */
async function invocarComando(argumentos: readonly string[]): Promise<number> {
  return handleCommand('create-new-playlist', ['create-new-playlist', ...argumentos]);
}

interface EjemploAprobado {
  readonly etiqueta: string;
  readonly argumentos: readonly string[];
  readonly solicitud: {
    readonly nombre: string;
    readonly descripcion: string;
    readonly visibilidad: EntradaVisibilidad;
  };
  readonly exito: Exito;
}

const DESCRIPCION_POR_DEFECTO = 'Playlist sin descripción';

// Los 4 ejemplos aprobados de P-001 (SPECS §CLI, AC-002, TEST_PLAN TC-021).
const EJEMPLOS: readonly EjemploAprobado[] = [
  {
    etiqueta: 'nombre y --private con descripción por defecto',
    argumentos: ['--name', 'Viaje 2026', '--private'],
    solicitud: {
      nombre: 'Viaje 2026',
      descripcion: DESCRIPCION_POR_DEFECTO,
      visibilidad: 'privada',
    },
    exito: crearExito('Viaje 2026', 'privada', DESCRIPCION_POR_DEFECTO),
  },
  {
    etiqueta: 'nombre, --private y --description "Carretera"',
    argumentos: ['--name', 'Viaje 2026', '--private', '--description', 'Carretera'],
    solicitud: { nombre: 'Viaje 2026', descripcion: 'Carretera', visibilidad: 'privada' },
    exito: crearExito('Viaje 2026', 'privada', 'Carretera'),
  },
  {
    etiqueta: 'nombre, --public y --description "Carretera"',
    argumentos: ['--name', 'Viaje 2026', '--public', '--description', 'Carretera'],
    solicitud: { nombre: 'Viaje 2026', descripcion: 'Carretera', visibilidad: 'publica' },
    exito: crearExito('Viaje 2026', 'publica', 'Carretera'),
  },
  {
    etiqueta: 'nombre y --public con descripción por defecto',
    argumentos: ['--name', 'Viaje 2026', '--public'],
    solicitud: {
      nombre: 'Viaje 2026',
      descripcion: DESCRIPCION_POR_DEFECTO,
      visibilidad: 'publica',
    },
    exito: crearExito('Viaje 2026', 'publica', DESCRIPCION_POR_DEFECTO),
  },
];

const CASOS_VISIBILIDAD: readonly {
  readonly etiqueta: EntradaVisibilidad;
  readonly argumentos: readonly string[];
}[] = [
  { etiqueta: 'ausente', argumentos: ['--name', 'Viaje 2026'] },
  { etiqueta: 'doble', argumentos: ['--name', 'Viaje 2026', '--public', '--private'] },
];

const NOMBRE_LARGO = 'x'.repeat(101);

const CASOS_NOMBRE: readonly {
  readonly etiqueta: string;
  readonly argumentos: readonly string[];
}[] = [
  { etiqueta: 'ausente', argumentos: ['--public'] },
  { etiqueta: 'de 2 caracteres visibles', argumentos: ['--name', 'ab', '--public'] },
  { etiqueta: 'de 101 caracteres visibles', argumentos: ['--name', NOMBRE_LARGO, '--public'] },
];

let salida = '';

describe('TC-021 — Comando directo spoty create-new-playlist (TASK-015)', () => {
  beforeEach(() => {
    salida = '';
    readlineDoble.textos.length = 0;
    readlineDoble.respuestas.length = 0;
    composicionDoble.casoUsoActual = undefined;
    vi.spyOn(process.stdout, 'write').mockImplementation((fragmento: string | Uint8Array) => {
      salida += typeof fragmento === 'string' ? fragmento : '';
      return true;
    });
  });

  afterEach(() => {
    closeReadline();
    vi.restoreAllMocks();
  });

  describe('los 4 ejemplos aprobados inician el flujo con los datos esperados (AC-002, P-001)', () => {
    for (const ejemplo of EJEMPLOS) {
      it(`ejemplo: ${ejemplo.etiqueta}`, async () => {
        const doble = crearDobleCasoUso(['invocarCanal'], ejemplo.exito);
        instalarCasoUso(doble);

        const codigo = await invocarComando(ejemplo.argumentos);

        // Delegación con los mismos tipos que la vía de menú y sin duplicadoAceptado.
        expect(codigo).toBe(0);
        expect(doble.invocaciones).toHaveLength(1);
        expect(doble.invocaciones[0]).toMatchObject(ejemplo.solicitud);
        expect(doble.invocaciones[0]).not.toHaveProperty('duplicadoAceptado');
        expect(salida).toContain(literalExito(ejemplo.exito));
        // Crea directamente sin confirmación adicional: cero peticiones
        // interactivas y canal pre-resuelto en `confirmada` (P-001, N-001, §6.1).
        expect(readlineDoble.textos).toEqual([]);
      });
    }
  });

  describe('visibilidad ausente o doble: literal de flag único sin continuar (AC-002, §6.3)', () => {
    it('fija los literales aprobados de visibilidad y de nombre (RNF-002)', () => {
      expect(MESSAGES.playlist.visibilityFlagError).toBe(
        'Se debe declarar flag único en comando --public o --private'
      );
      expect(MESSAGES.playlist.nameLengthError).toBe(
        'Error en longitud del nombre de la playlist, mínimo 3, máximo 100 caracteres totales.'
      );
      expect(MESSAGES.playlist.namePrompt).toBe('Nombre de la playlist (3-100 caracteres):');
    });

    for (const caso of CASOS_VISIBILIDAD) {
      it(`con visibilidad ${caso.etiqueta} el comando traduce los indicadores y Business decide`, async () => {
        const doble = crearDobleCasoUso([{ resultado: 'errorValidacion', campo: 'visibilidad' }]);
        instalarCasoUso(doble);

        const codigo = await invocarComando(caso.argumentos);

        expect(codigo).toBe(1);
        expect(doble.invocaciones).toHaveLength(1);
        expect(doble.invocaciones[0]).toMatchObject({
          nombre: 'Viaje 2026',
          visibilidad: caso.etiqueta,
        });
        expect(salida).toContain(MESSAGES.playlist.visibilityFlagError);
        // No continúa hasta corregir la invocación: cero peticiones interactivas.
        expect(readlineDoble.textos).toEqual([]);
      });
    }
  });

  describe('nombre ausente o fuera de 3-100: literal de longitud y reingreso interactivo (AC-005, UC-001-E3)', () => {
    for (const caso of CASOS_NOMBRE) {
      it(`con nombre ${caso.etiqueta} continúa con la petición de nombre y pide confirmación tras el reingreso`, async () => {
        const exitoReingreso = crearExito('Viaje Nuevo', 'publica', DESCRIPCION_POR_DEFECTO);
        const doble = crearDobleCasoUso(
          [{ resultado: 'errorValidacion', campo: 'nombre' }, 'invocarCanal'],
          exitoReingreso
        );
        instalarCasoUso(doble);
        readlineDoble.respuestas.push('Viaje Nuevo', 's');

        const codigo = await invocarComando(caso.argumentos);

        expect(codigo).toBe(0);
        expect(salida).toContain(MESSAGES.playlist.nameLengthError);
        expect(salida).toContain(literalExito(exitoReingreso));
        // Continúa en modo interactivo con la petición literal de nombre (P-001,
        // §6.2) y, al ser reingreso, la confirmación se solicita por el canal
        // (N-001) mostrando el resumen previo (DISC-006).
        expect(readlineDoble.textos).toEqual([
          MESSAGES.playlist.namePrompt,
          `Resumen de la playlist: "Viaje Nuevo" (pública, descripción: "${DESCRIPCION_POR_DEFECTO}")\n¿Crear la playlist con estos datos? (s/N): `,
        ]);
        expect(doble.invocaciones).toHaveLength(2);
        expect(doble.invocaciones[1]).toMatchObject({
          nombre: 'Viaje Nuevo',
          descripcion: DESCRIPCION_POR_DEFECTO,
          visibilidad: 'publica',
        });
        expect(doble.invocaciones[1]).not.toHaveProperty('duplicadoAceptado');
      });
    }
  });

  it('el comando no contiene reglas de validación ni de duplicados propias y delega en el coordinador (RNF-003)', () => {
    const fuente = readFileSync(
      join(RAIZ, 'src', 'presentation', 'comando-crear-playlist.ts'),
      'utf8'
    );
    const logica = readFileSync(join(RAIZ, 'src', 'cli-main.ts'), 'utf8');

    // Sin reglas de dominio propias ni duplicación de validación y duplicados.
    expect(fuente).not.toMatch(
      /esLongitudValida|esDuplicadoPropio|resolverVisibilidad|recortarNombre|withRetry/
    );
    // Sin efectos secundarios directos ni tipos inseguros (RNF-003, RNF-005).
    expect(fuente).not.toMatch(/from\s+['"][^'"]*\/data\//);
    expect(fuente).not.toMatch(/node:fs|node:http|\bfetch\s*\(|\bprocess\./);
    expect(fuente).not.toMatch(/\bconsole\.(log|error|warn|info|debug)\s*\(/);
    expect(fuente).not.toMatch(/\bany\b/);
    // Sin literales aprobados incrustados: los gestiona el coordinador con MESSAGES.
    expect(fuente).not.toContain(DESCRIPCION_POR_DEFECTO);
    expect(fuente).not.toContain('Se debe declarar flag único');
    expect(fuente).not.toContain('Error en longitud del nombre');

    // Delegación en la composición (TASK-013), el coordinador (TASK-014) y el
    // predicado de descripción de Business (TASK-005), con la confirmación
    // pre-resuelta del disparador de comando directo (P-001, N-001, DISC-002).
    expect(fuente).toContain('componerCrearPlaylistVacia');
    expect(fuente).toContain('ejecutarFlujoCreacion');
    expect(fuente).toContain('peticionesDeTerminal');
    expect(fuente).toContain('resolverDescripcionEfectiva');
    expect(fuente).toContain('confirmacionPreResuelta: true');

    // Alta del comando en handleCommand: punto de entrada funcional (AC-002).
    expect(logica).toContain("case 'create-new-playlist'");
    expect(logica).toContain('ejecutarComandoCrearPlaylist');
  });
});
