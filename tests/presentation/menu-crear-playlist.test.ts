/**
 * TC-022 — Menú interactivo: opción `4. Crear playlist vacía` (TASK-016).
 *
 * Trazabilidad: `OBJ-001 → RF-001, RF-002, RNF-002 → UC-001 → AC-003 →
 * TASK-016 → TC-022`.
 *
 * Integración del modo interactivo con doble de `readline` (patrón de
 * TC-018, con la señal `SIGINT` simulada para `Ctrl+C`), doble de la
 * composición de TASK-013 y doble del flujo de autenticación: el menú
 * muestra la opción de creación con la ayuda literal, la opción `4`
 * enruta al coordinador TASK-014 con las peticiones de TASK-012 y la
 * confirmación del flujo interactivo (N-001, sin entrada directa), las
 * opciones `1`, `2`, `3`, `9` y `0` conservan su comportamiento y las
 * etiquetas del selector coinciden con la numeración real del menú
 * (N-004). Sin red real, sin teclado real y sin escritura en `data/`.
 */
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Exito, ResultadoCreacion, SolicitudCreacion } from '@/business/playlists/types.js';
import { runInteractiveMode } from '@/cli-main.js';
import type { CasoUsoCrearPlaylist } from '@/presentation/composicion-crear-playlist.js';
import { MESSAGES } from '@/presentation/messages.js';
import { FORMATO_CONFIRMACION, closeReadline, promptMenuChoice } from '@/presentation/prompts.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const DIRECTORIO_TEMPORAL = join(tmpdir(), 'spoty2-tc-022');

// Aislamiento: sin escritura en `data/` del repositorio y sin red real.
process.env.SPOTY_LOG_DIR = DIRECTORIO_TEMPORAL;
process.env.SPOTY_LOG_FILE = join(DIRECTORIO_TEMPORAL, 'app.log');
process.env.SPOTY_TOKENS_FILE = join(DIRECTORIO_TEMPORAL, 'tokens.json');

const CLIENT_ID_PREVIO = process.env.SPOTIFY_CLIENT_ID;
const REDIRECT_PREVIO = process.env.SPOTIFY_REDIRECT_URI;

/** Selector del menú alineado con la numeración real `0-4,9` (N-004). */
const SELECTOR = '\nSelecciona una opción (0-4,9): ';
const CONFIRMACION_SALIDA = '¿Estás seguro de que quieres salir? (s/N): ';
const VUELTA_AL_MENU = 'Volviendo al menú principal...';

// Doble de `readline`: registra las peticiones reales, consume respuestas
// programadas y, ante `Ctrl+C`, dispara los escuchadores `SIGINT` que la
// petición interactiva haya registrado (sin teclado real).
const readlineDoble = vi.hoisted(() => ({
  textos: [] as string[],
  respuestas: [] as string[],
  interrupciones: new Set<() => void>(),
}));

vi.mock('node:readline/promises', () => ({
  createInterface: () => ({
    async question(texto: string): Promise<string> {
      readlineDoble.textos.push(texto);
      const respuesta = readlineDoble.respuestas.shift();
      if (respuesta === undefined) {
        throw new Error(`Doble de readline sin respuesta programada para «${texto}».`);
      }
      if (respuesta === 'ctrl+c') {
        const escuchadores = [...readlineDoble.interrupciones];
        if (escuchadores.length === 0) {
          throw new Error(`Ctrl+C sin escuchador en «${texto}»: la petición no lo maneja.`);
        }
        for (const escuchador of escuchadores) {
          escuchador();
        }
        return new Promise<string>(() => {});
      }
      return respuesta;
    },
    once(_evento: string, escuchador: () => void): void {
      readlineDoble.interrupciones.add(escuchador);
    },
    removeListener(_evento: string, escuchador: () => void): void {
      readlineDoble.interrupciones.delete(escuchador);
    },
    close(): void {
      readlineDoble.interrupciones.clear();
    },
  }),
}));

// Doble de la composición de TASK-013: el menú recibe el caso de uso doblado.
const composicionDoble = vi.hoisted(() => ({
  casoUsoActual: undefined as unknown,
}));

vi.mock('@/presentation/composicion-crear-playlist.js', () => ({
  componerCrearPlaylistVacia: () => composicionDoble.casoUsoActual,
}));

// Doble del flujo de autenticación: la opción 1 encuentra sesión vigente y
// no abre navegador ni servidor de callback.
const flujoAuthDoble = vi.hoisted(() => ({
  llamadasSesion: 0,
  sesion: {
    tokens: { access_token: 'testigo-tc022-ficticio' },
    profile: { display_name: 'Usuaria TC-022', email: 'tc022@example.test' },
  },
}));

vi.mock('@/business/auth/flow.js', () => ({
  checkExistingSession: async () => {
    flujoAuthDoble.llamadasSesion += 1;
    return flujoAuthDoble.sesion;
  },
  runAuthFlow: async () => {
    throw new Error('runAuthFlow no debe invocarse en TC-022.');
  },
}));

/** Éxito programado del doble de caso de uso. */
const EXITO: Exito = {
  resultado: 'exito',
  nombreEfectivo: 'Viaje 2026',
  visibilidad: 'publica',
  descripcionEfectiva: 'Playlist sin descripción',
  identificador: 'pl-tc022',
  enlace: 'https://open.spotify.com/playlist/pl-tc022',
};

/** Literal único de éxito que presenta el coordinador a partir del resultado. */
const LITERAL_EXITO =
  'Playlist creada: "Viaje 2026" (pública, descripción: "Playlist sin descripción", ' +
  'id: pl-tc022, enlace: https://open.spotify.com/playlist/pl-tc022)';

type Comportamiento = ResultadoCreacion | 'invocarCanal';

interface DobleCasoUso {
  readonly casoUso: CasoUsoCrearPlaylist;
  readonly invocaciones: SolicitudCreacion[];
}

/**
 * Instala en la composición un doble del caso de uso que registra las
 * solicitudes y ejecuta el comportamiento programado; `invocarCanal` simula
 * a Business invocando el canal de confirmación (DISC-002) y devuelve
 * éxito o `Cancelado` según su desenlace.
 */
function instalarCasoUso(comportamientos: readonly Comportamiento[]): DobleCasoUso {
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
  composicionDoble.casoUsoActual = casoUso;
  return { casoUso, invocaciones };
}

function restaurarVariable(clave: string, valor: string | undefined): void {
  if (valor === undefined) {
    delete process.env[clave];
    return;
  }
  process.env[clave] = valor;
}

/** Veces que aparece un texto en la salida capturada. */
function apariciones(texto: string): number {
  return salida.split(texto).length - 1;
}

let salida = '';

describe('TC-022 — Opción 4. Crear playlist vacía del menú interactivo (TASK-016)', () => {
  beforeEach(() => {
    salida = '';
    readlineDoble.textos.length = 0;
    readlineDoble.respuestas.length = 0;
    readlineDoble.interrupciones.clear();
    composicionDoble.casoUsoActual = undefined;
    flujoAuthDoble.llamadasSesion = 0;
    process.env.SPOTIFY_CLIENT_ID = 'client-id-tc-022';
    process.env.SPOTIFY_REDIRECT_URI = 'http://127.0.0.1:8888/callback';
    vi.spyOn(process.stdout, 'write').mockImplementation((fragmento: string | Uint8Array) => {
      salida += typeof fragmento === 'string' ? fragmento : '';
      return true;
    });
  });

  afterEach(() => {
    closeReadline();
    restaurarVariable('SPOTIFY_CLIENT_ID', CLIENT_ID_PREVIO);
    restaurarVariable('SPOTIFY_REDIRECT_URI', REDIRECT_PREVIO);
    vi.restoreAllMocks();
  });

  it('el menú muestra la opción de creación con la ayuda literal y conserva las opciones 1, 2, 3, 9 y 0', async () => {
    readlineDoble.respuestas.push('0', 's');

    const codigo = await runInteractiveMode();

    expect(codigo).toBe(0);
    expect(salida).toContain('1. Conectar con Spotify');
    expect(salida).toContain('2. Ver estado de conexión');
    expect(salida).toContain('3. Descargar biblioteca');
    expect(salida).toContain('4. Crear playlist vacía');
    expect(salida).toContain('9. Cerrar sesión');
    expect(salida).toContain('0. Salir');
    expect(salida).toContain('(navega con 0-4,9, Ctrl+C para cancelar)');
    expect(salida).not.toContain('(navega con 0-3,9, Ctrl+C para cancelar)');
    expect(salida).toContain('¡Hasta luego!');
  });

  it('la opción 4 pide nombre, descripción y visibilidad con pública preseleccionada, confirma en (s/N): y crea', async () => {
    const doble = instalarCasoUso(['invocarCanal']);
    readlineDoble.respuestas.push('4', 'Viaje 2026', '', '', 's', '0', 's');

    const codigo = await runInteractiveMode();

    expect(codigo).toBe(0);
    expect(readlineDoble.textos).toEqual([
      SELECTOR,
      MESSAGES.playlist.namePrompt,
      MESSAGES.playlist.descriptionPrompt,
      expect.stringContaining('Pública (preseleccionada)'),
      FORMATO_CONFIRMACION,
      SELECTOR,
      CONFIRMACION_SALIDA,
    ]);
    expect(doble.invocaciones).toHaveLength(1);
    expect(doble.invocaciones[0]).toMatchObject({
      nombre: 'Viaje 2026',
      descripcion: 'Playlist sin descripción',
      visibilidad: 'publica',
    });
    expect(doble.invocaciones[0]).not.toHaveProperty('duplicadoAceptado');
    expect(salida).toContain(LITERAL_EXITO);
    expect(salida).toContain('(navega con 0-4,9, Ctrl+C para cancelar)');
    expect(salida).toContain(VUELTA_AL_MENU);
  });

  it('con una respuesta distinta de «s» la confirmación cancela y vuelve al menú sin crear', async () => {
    const doble = instalarCasoUso(['invocarCanal']);
    readlineDoble.respuestas.push('4', 'Viaje 2026', '', '', 'N', '0', 's');

    const codigo = await runInteractiveMode();

    expect(codigo).toBe(0);
    expect(doble.invocaciones).toHaveLength(1);
    expect(salida).not.toContain('Playlist creada:');
    expect(salida).toContain(VUELTA_AL_MENU);
    expect(apariciones('Menú Principal')).toBe(2);
  });

  const CASOS_CTRL_C: readonly {
    readonly etiqueta: string;
    readonly respuestas: readonly string[];
    readonly invocaciones: number;
  }[] = [
    { etiqueta: 'nombre', respuestas: ['4', 'ctrl+c', '0', 's'], invocaciones: 0 },
    {
      etiqueta: 'confirmación',
      respuestas: ['4', 'Viaje 2026', '', '', 'ctrl+c', '0', 's'],
      invocaciones: 1,
    },
  ];

  for (const caso of CASOS_CTRL_C) {
    it(`Ctrl+C durante la petición de ${caso.etiqueta} aborta sin crear y vuelve al menú`, async () => {
      const doble = instalarCasoUso(['invocarCanal']);
      readlineDoble.respuestas.push(...caso.respuestas);

      const codigo = await runInteractiveMode();

      expect(codigo).toBe(0);
      expect(doble.invocaciones).toHaveLength(caso.invocaciones);
      expect(salida).not.toContain('Playlist creada:');
      expect(salida).toContain(VUELTA_AL_MENU);
      expect(apariciones('Menú Principal')).toBe(2);
    });
  }

  it('las opciones 1, 2, 3, 9 y 0 conservan su comportamiento anterior', async () => {
    readlineDoble.respuestas.push('1', '2', '3', '9', 'n', '0', 's');

    const codigo = await runInteractiveMode();

    expect(codigo).toBe(0);
    // Opción 1: conexión con la sesión vigente aportada por el doble de flujo.
    expect(flujoAuthDoble.llamadasSesion).toBe(1);
    expect(salida).toContain('Sesión activa: Usuaria TC-022 (tc022@example.test)');
    // Opción 2: estado sin sesión almacenada.
    expect(salida).toContain(MESSAGES.errors.configRequired);
    // Opción 3: descarga sin sesión con el aviso de conectar con la opción 1.
    expect(salida).toContain('Primero debes conectar con Spotify usando la opción 1.');
    // Opción 9: cierre de sesión con su pregunta y cancelación ante «n».
    expect(readlineDoble.textos).toContain(MESSAGES.auth.logoutConfirm);
    expect(salida).toContain('Cancelado.');
    // Opción 0: salida con su confirmación.
    expect(readlineDoble.textos).toContain(CONFIRMACION_SALIDA);
    expect(salida).toContain('¡Hasta luego!');
    expect(apariciones('Menú Principal')).toBe(5);
  });

  it('las etiquetas del selector coinciden con la numeración real del menú (N-004)', async () => {
    const OPCIONES: readonly [string, string][] = [
      ['1', MESSAGES.menu.connect],
      ['2', MESSAGES.menu.status],
      ['3', MESSAGES.menu.download],
      ['4', MESSAGES.menu.createPlaylist],
      ['9', MESSAGES.menu.logout],
      ['0', MESSAGES.menu.exit],
    ];
    readlineDoble.respuestas.push(...OPCIONES.map(([opcion]) => opcion));

    const elecciones: string[] = [];
    for (let i = 0; i < OPCIONES.length; i++) {
      elecciones.push(await promptMenuChoice());
    }

    expect(elecciones).toEqual(OPCIONES.map(([opcion]) => opcion));
    expect(readlineDoble.textos).toEqual(OPCIONES.map(() => SELECTOR));
    for (const [, item] of OPCIONES) {
      expect(item).toMatch(/^\d+\.\s/);
      expect(salida).toContain(`→ ${item.replace(/^\d+\.\s*/, '')}`);
    }
  });

  it('la opción 4 delega en el coordinador sin entrada directa y los literales salen de MESSAGES (RNF-002, RNF-003)', () => {
    const logica = readFileSync(join(RAIZ, 'src', 'cli-main.ts'), 'utf8');
    const prompts = readFileSync(join(RAIZ, 'src', 'presentation', 'prompts.ts'), 'utf8');

    // Ruta de la opción 4 hacia el coordinador con las peticiones terminales.
    expect(logica).toContain("case '4'");
    expect(logica).toContain('ejecutarFlujoCreacion');
    expect(logica).toContain('peticionesDeTerminal');
    expect(logica).toContain('componerCrearPlaylistVacia');
    // Flujo interactivo: la confirmación no viaja pre-resuelta (N-001).
    expect(logica).not.toContain('entradaDirecta');
    expect(logica).not.toContain('confirmacionPreResuelta');
    // Ítem y ayuda desde MESSAGES (TASK-011), sin literales propios.
    expect(logica).toContain('MESSAGES.menu.createPlaylist');
    expect(logica).toContain('MESSAGES.menu.hintCreatePlaylist');
    expect(logica).not.toContain('4. Crear playlist vacía');
    expect(logica).not.toMatch(/from\s+['"][^'"]*\/data\//);
    expect(logica).not.toMatch(/\bany\b/);
    // Selector y etiquetas sin numeración ni literales propios (N-004).
    expect(prompts).not.toContain('0-5');
    expect(prompts).not.toMatch(/'(Descargar biblioteca|Crear playlist vacía|Cerrar sesión)'/);
  });
});
