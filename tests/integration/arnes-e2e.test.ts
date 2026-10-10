/**
 * TC-023 — Arnés de extremo a extremo con Spotify simulado (TASK-017).
 *
 * Trazabilidad: `OBJ-001 → RF-001, RF-002, RNF-001, RNF-004 → UC-001 →
 * AC-001, AC-002, AC-003, AC-004, AC-005 → TASK-017 → TC-023`.
 *
 * Integración completa sobre las utilidades de `tests/helpers/arnes-e2e.ts`:
 * el comando directo y el menú interactivo se ejecutan de extremo a extremo
 * con la composición real de TASK-013 y con Spotify simulado por el doble de
 * `fetch` (que rechaza toda URL no simulada), ficheros de tokens y de
 * registro en directorio temporal mediante `SPOTY_TOKENS_FILE` y
 * `SPOTY_LOG_FILE`, salida de consola capturada e entrada interactiva
 * simulada con `Ctrl+C`. Ninguna prueba necesita Internet, credenciales
 * reales ni escribe en `data/` del repositorio (RNF-001, RNF-004, UC-001).
 */
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleCommand, runInteractiveMode } from '@/cli-main.js';
import { MESSAGES } from '@/presentation/messages.js';
import { closeReadline } from '@/presentation/prompts.js';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type SalidaCapturada,
  type SpotifySimulado,
  aislarFicherosEnTemporal,
  capturarSalidaConsola,
  contenidoDe,
  escribirTokensFicticios,
  esperarEventosNuevos,
  estadoReadline,
  leerTramoNuevo,
  marcarRegistro,
  reglasCreacionExitosa,
  simularSpotify,
} from '../helpers/arnes-e2e.js';

// El arnés simula la entrada interactiva (incluido `Ctrl+C`) interceptando
// `readline` con el doble compartido de las utilidades, sin teclado real.
vi.mock('node:readline/promises', async () => {
  const { moduloReadlineSimulado } = await import('../helpers/arnes-e2e.js');
  return moduloReadlineSimulado();
});

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const RUTAS = aislarFicherosEnTemporal('spoty2-tc-023');

const TESTIGO = 'testigo-tc-023-ficticio';
const NOMBRE = 'Viaje Arnes TC023';
const DESCRIPCION = 'Carretera';
const IDENTIFICADOR = 'pl-tc023';
const ENLACE = 'https://open.spotify.com/playlist/pl-tc023';
const USUARIO = 'usuario-tc-023';
const URL_CREACION = 'https://api.spotify.com/v1/me/playlists';

const RUTA_LOG_REAL = join(RAIZ, 'data', 'app.log');
const RUTA_TOKENS_REAL = join(RAIZ, 'data', 'tokens.json');

const MENSAJE_INICIO = 'Inicio de creación de playlist vacía';
const MENSAJE_EXITO = 'Playlist creada con éxito';

const SELECTOR = '\nSelecciona una opción (0-4,9): ';
const CONFIRMACION_SALIDA = '¿Estás seguro de que quieres salir? (s/N): ';
const VUELTA_AL_MENU = 'Volviendo al menú principal...';

// Confirmación final con resumen previo (DISC-006): nombre y descripción de este
// arnés, visibilidad pública preseleccionada y descripción por defecto.
const PREGUNTA_CONFIRMACION = '¿Crear la playlist con estos datos? (s/N): ';
const CONFIRMACION_RESUMEN = `Resumen de la playlist: "${NOMBRE}" (pública, descripción: "Playlist sin descripción")\n${PREGUNTA_CONFIRMACION}`;

// Literales aprobados (P-006, RF-002) compuestos con los datos de este arnés.
const LITERAL_EXITO_COMANDO =
  `Playlist creada: "${NOMBRE}" (privada, descripción: "${DESCRIPCION}", ` +
  `id: ${IDENTIFICADOR}, enlace: ${ENLACE})`;
const LITERAL_EXITO_MENU =
  `Playlist creada: "${NOMBRE}" (pública, descripción: "Playlist sin descripción", ` +
  `id: ${IDENTIFICADOR}, enlace: ${ENLACE})`;

let salida: SalidaCapturada;
let red: SpotifySimulado;
let marcaRegistro = 0;

function reglasDePrueba() {
  return reglasCreacionExitosa({
    identificador: IDENTIFICADOR,
    enlace: ENLACE,
    usuario: USUARIO,
    propias: [],
  });
}

/** Común de ambos abortos con `Ctrl+C`: sin creación presentada ni registrada. */
function comprobarAborto(tramo: string): void {
  expect(salida.texto()).not.toContain('Playlist creada:');
  expect(salida.texto()).toContain(VUELTA_AL_MENU);
  expect(tramo).not.toContain(MENSAJE_INICIO);
  expect(tramo).not.toContain(MENSAJE_EXITO);
}

describe('TC-023 — Arnés de extremo a extremo con Spotify simulado (TASK-017)', () => {
  beforeEach(async () => {
    escribirTokensFicticios(RUTAS.rutaTokens, TESTIGO);
    estadoReadline.reiniciar();
    salida = capturarSalidaConsola();
    red = simularSpotify(reglasDePrueba());
    marcaRegistro = await marcarRegistro(RUTAS.rutaLog);
  });

  afterEach(() => {
    closeReadline();
    salida.restaurar();
    red.restaurar();
  });

  afterAll(() => {
    try {
      rmSync(RUTAS.directorio, { recursive: true, force: true });
    } catch {
      // El transporte de Pino mantiene el fichero abierto hasta cerrar el proceso.
    }
  });

  it('ejecuta el comando create-new-playlist de extremo a extremo con Spotify simulado', async () => {
    const codigo = await handleCommand('create-new-playlist', [
      'create-new-playlist',
      '--name',
      NOMBRE,
      '--description',
      DESCRIPCION,
      '--private',
    ]);

    expect(codigo).toBe(0);
    expect(salida.texto()).toContain(LITERAL_EXITO_COMANDO);

    // La creación llega a Spotify simulado y toda la red observada es la simulada.
    const creacion = red.llamadas.find((llamada) => llamada.metodo === 'POST');
    expect(creacion?.url).toBe(URL_CREACION);
    expect(red.llamadas.length).toBeGreaterThan(0);
    for (const llamada of red.llamadas) {
      expect(llamada.url).toMatch(/^https:\/\/api\.spotify\.com\/v1\//);
    }

    // El registro técnico acaba en el fichero temporal del arnés.
    const lineas = await esperarEventosNuevos(RUTAS.rutaLog, marcaRegistro, [
      MENSAJE_INICIO,
      MENSAJE_EXITO,
    ]);
    const exito = lineas.find((linea) => linea.msg === MENSAJE_EXITO);
    expect(exito).toMatchObject({
      level: 30,
      nombre: NOMBRE,
      visibilidad: 'privada',
      descripcionEfectiva: DESCRIPCION,
      identificador: IDENTIFICADOR,
    });
  });

  it('ejecuta el menú interactivo de extremo a extremo: la opción 4 crea y vuelve al menú', async () => {
    estadoReadline.programar('4', NOMBRE, '', '', 's', '0', 's');

    const codigo = await runInteractiveMode();

    expect(codigo).toBe(0);
    expect(salida.texto()).toContain(LITERAL_EXITO_MENU);
    expect(salida.texto()).toContain(VUELTA_AL_MENU);
    expect(salida.texto()).toContain('¡Hasta luego!');
    expect(estadoReadline.textos).toEqual([
      SELECTOR,
      MESSAGES.playlist.namePrompt,
      MESSAGES.playlist.descriptionPrompt,
      expect.stringContaining('Pública (preseleccionada)'),
      CONFIRMACION_RESUMEN,
      SELECTOR,
      CONFIRMACION_SALIDA,
    ]);
    const creacion = red.llamadas.find((llamada) => llamada.metodo === 'POST');
    expect(creacion?.url).toBe(URL_CREACION);
    await esperarEventosNuevos(RUTAS.rutaLog, marcaRegistro, [MENSAJE_INICIO, MENSAJE_EXITO]);
  });

  it('simula Ctrl+C en la petición de nombre: aborta sin red, sin crear y sin registrar', async () => {
    estadoReadline.programar('4', 'ctrl+c', '0', 's');

    const codigo = await runInteractiveMode();

    expect(codigo).toBe(0);
    expect(estadoReadline.abortos).toBe(1);
    expect(red.llamadas).toHaveLength(0);
    comprobarAborto(await leerTramoNuevo(RUTAS.rutaLog, marcaRegistro));
  });

  it('simula Ctrl+C en la confirmación: cancela tras listar sin crear ni registrar', async () => {
    estadoReadline.programar('4', NOMBRE, '', '', 'ctrl+c', '0', 's');

    const codigo = await runInteractiveMode();

    expect(codigo).toBe(0);
    expect(estadoReadline.abortos).toBe(1);
    // La sesión y el listado sí se consultan; la creación no llega a emitirse.
    expect(red.llamadas.length).toBeGreaterThan(0);
    expect(red.llamadas.some((llamada) => llamada.metodo === 'POST')).toBe(false);
    comprobarAborto(await leerTramoNuevo(RUTAS.rutaLog, marcaRegistro));
  });

  it('el doble de red rechaza toda URL no simulada: ninguna petición puede salir a Internet', async () => {
    await expect(fetch('https://api.spotify.com/v1/albums/no-simulada')).rejects.toThrow(
      'URL no simulada en la prueba'
    );
    expect(red.llamadas.map((llamada) => llamada.url)).toEqual([
      'https://api.spotify.com/v1/albums/no-simulada',
    ]);
  });

  it('aisla tokens y registro en el temporal sin tocar data/ ni usar credenciales reales', async () => {
    const codigo = await handleCommand('create-new-playlist', [
      'create-new-playlist',
      '--name',
      NOMBRE,
      '--public',
    ]);

    expect(codigo).toBe(0);
    expect(process.env.SPOTY_TOKENS_FILE).toBe(RUTAS.rutaTokens);
    expect(process.env.SPOTY_LOG_FILE).toBe(RUTAS.rutaLog);
    expect(RUTAS.rutaTokens.startsWith(tmpdir())).toBe(true);
    expect(RUTAS.rutaLog.startsWith(tmpdir())).toBe(true);
    expect(contenidoDe(RUTAS.rutaTokens)).toContain(TESTIGO);
    await esperarEventosNuevos(RUTAS.rutaLog, marcaRegistro, [MENSAJE_EXITO]);

    // Sin credenciales reales: solo el testigo ficticio y ningún testigo en salida ni registro.
    expect(salida.texto()).not.toContain(TESTIGO);
    const logTemporal = contenidoDe(RUTAS.rutaLog);
    expect(logTemporal).not.toMatch(/bearer/i);
    expect(logTemporal).not.toContain(TESTIGO);

    // Sin escritura en el repositorio: `data/` real no contiene los marcadores del arnés.
    expect(contenidoDe(RUTA_LOG_REAL)).not.toContain(NOMBRE);
    expect(contenidoDe(RUTA_LOG_REAL)).not.toContain(TESTIGO);
    expect(contenidoDe(RUTA_TOKENS_REAL)).not.toContain(TESTIGO);
  });
});
