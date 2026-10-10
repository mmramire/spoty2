/**
 * TC-019 — Composición de dependencias reales (TASK-013).
 *
 * Trazabilidad: `OBJ-001 → RF-001, RNF-003, RNF-006 → UC-001, UC-001-E1 →
 * AC-001, AC-004 → TASK-013 → TC-019`.
 *
 * Integración con red simulada (doble de `fetch`) y con tokens y registro en
 * ficheros temporales (`SPOTY_TOKENS_FILE`, `SPOTY_LOG_FILE`): el caso de uso
 * compuesto devuelve éxito, escribe el registro en el fichero temporal, no
 * toca `data/` del repositorio, conserva `REQUIRED_SCOPES` sin cambios y
 * mantiene las tres capas sin dependencias invertidas (RNF-003, RNF-006).
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REQUIRED_SCOPES } from '@/business/auth/types.js';
import { getLogger } from '@/data/logging/pino-setup.js';
import { componerCrearPlaylistVacia } from '@/presentation/composicion-crear-playlist.js';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const DIRECTORIO_TEMPORAL = join(tmpdir(), 'spoty2-tc-019');
const RUTA_LOG = join(DIRECTORIO_TEMPORAL, 'app.log');
const RUTA_TOKENS = join(DIRECTORIO_TEMPORAL, 'tokens.json');
const RUTA_LOG_REAL = join(RAIZ, 'data', 'app.log');
const RUTA_TOKENS_REAL = join(RAIZ, 'data', 'tokens.json');

// Aislamiento: sin escritura en `data/` del repositorio y sin red real
// (TEST_PLAN TC-019). El logger se fija antes de la primera invocación.
process.env.SPOTY_LOG_DIR = DIRECTORIO_TEMPORAL;
process.env.SPOTY_LOG_FILE = RUTA_LOG;
process.env.SPOTY_TOKENS_FILE = RUTA_TOKENS;

const TESTIGO_SESION = 'testigo-tc-019-ficticio';
const IDENTIFICADOR = 'pl-tc019';
const ENLACE = 'https://open.spotify.com/playlist/pl-tc019';
const NOMBRE_EXITO = ' Viaje 2026 ';
const NOMBRE_REGISTRO = 'Viaje Registro TC019';
const URL_PERFIL = 'https://api.spotify.com/v1/me';
const TIEMPO_LIMITE_ESPERA_MS = 5000;
const INTERVALO_ESPERA_MS = 25;

const MODULOS_NEGOCIO: readonly string[] = [
  'src/business/playlists/types.ts',
  'src/business/playlists/puertos.ts',
  'src/business/playlists/validacion.ts',
  'src/business/playlists/errores.ts',
  'src/business/playlists/politica-reintento.ts',
  'src/business/playlists/crear-playlist.ts',
];

const MODULOS_DATOS: readonly string[] = [
  'src/data/http/playlists-client.ts',
  'src/data/logging/registro-tecnico.ts',
];

/** Línea JSON del registro técnico. */
interface LineaRegistro {
  readonly level?: number;
  readonly msg?: unknown;
  readonly [clave: string]: unknown;
}

/** Llamada observada por el doble de red. */
interface LlamadaSimulada {
  readonly url: string;
  readonly metodo: string;
  readonly cabeceras: Record<string, string>;
  readonly cuerpo: string | null;
}

/** Regla del doble de red: coincide por fragmento de URL y, si se indica, por método. */
interface ReglaRespuesta {
  readonly cuandoContenga: string;
  readonly metodo?: string;
  readonly respuesta: () => Response;
}

function leerFuente(rutaRelativa: string): string {
  return readFileSync(join(RAIZ, rutaRelativa), 'utf8');
}

function respuestaJson(status: number, cuerpo: unknown): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function urlDe(entrada: unknown): string {
  if (typeof entrada === 'string') {
    return entrada;
  }
  if (entrada instanceof URL) {
    return entrada.href;
  }
  if (typeof entrada === 'object' && entrada !== null && 'url' in entrada) {
    return String((entrada as { url: unknown }).url);
  }
  return String(entrada);
}

function cabecerasDe(init?: RequestInit): Record<string, string> {
  const headers = init?.headers;
  if (!headers) {
    return {};
  }
  if (typeof headers === 'object' && !Array.isArray(headers) && !('get' in headers)) {
    return { ...(headers as Record<string, string>) };
  }
  return Object.fromEntries(new Headers(headers).entries());
}

/** Instala el doble de red global y devuelve las llamadas observadas. */
function instalarRedSimulada(reglas: readonly ReglaRespuesta[]): LlamadaSimulada[] {
  const llamadas: LlamadaSimulada[] = [];
  const doble = async (entrada: unknown, init?: RequestInit): Promise<Response> => {
    const url = urlDe(entrada);
    const metodo = init?.method ?? 'GET';
    llamadas.push({
      url,
      metodo,
      cabeceras: cabecerasDe(init),
      cuerpo: init?.body === undefined ? null : String(init.body),
    });
    const regla = reglas.find(
      (candidate) =>
        url.includes(candidate.cuandoContenga) &&
        (candidate.metodo === undefined || candidate.metodo === metodo)
    );
    if (!regla) {
      throw new Error(`URL no simulada en la prueba: ${url}`);
    }
    return regla.respuesta();
  };
  vi.stubGlobal('fetch', doble);
  return llamadas;
}

function reglasFlujoFeliz(): ReglaRespuesta[] {
  return [
    {
      cuandoContenga: '/v1/me/playlists',
      metodo: 'POST',
      respuesta: () =>
        respuestaJson(201, {
          id: IDENTIFICADOR,
          external_urls: { spotify: ENLACE },
        }),
    },
    {
      cuandoContenga: '/v1/me/playlists',
      respuesta: () => respuestaJson(200, { items: [], next: null }),
    },
    {
      cuandoContenga: '/v1/me',
      respuesta: () =>
        respuestaJson(200, {
          id: 'usuario-tc-019',
          display_name: 'Usuario TC-019',
          email: 'usuario-tc-019@example.test',
        }),
    },
  ];
}

function escribirTokensFicticios(): void {
  const tokens = {
    access_token: TESTIGO_SESION,
    refresh_token: 'refresh-tc-019-ficticio',
    expires_at: Date.now() + 3_600_000,
    scope: REQUIRED_SCOPES.join(' '),
    token_type: 'Bearer',
  };
  writeFileSync(RUTA_TOKENS, JSON.stringify(tokens, null, 2), 'utf8');
}

function leerRegistro(): string {
  return existsSync(RUTA_LOG) ? readFileSync(RUTA_LOG, 'utf8') : '';
}

function lineasDeRegistro(): LineaRegistro[] {
  const contenido = leerRegistro().trim();
  if (contenido === '') {
    return [];
  }
  const lineas: LineaRegistro[] = [];
  for (const linea of contenido.split('\n')) {
    try {
      const valor: unknown = JSON.parse(linea);
      if (typeof valor === 'object' && valor !== null) {
        lineas.push(valor as LineaRegistro);
      }
    } catch {
      // El transporte de Pino puede escribir líneas incompletas durante el vaciado.
    }
  }
  return lineas;
}

async function esperarMensajes(mensajes: readonly string[]): Promise<LineaRegistro[]> {
  await new Promise<void>((resolve) => getLogger().flush(() => resolve()));
  const limite = Date.now() + TIEMPO_LIMITE_ESPERA_MS;
  let lineas = lineasDeRegistro();
  while (!mensajes.every((mensaje) => lineas.some((linea) => linea.msg === mensaje))) {
    if (Date.now() > limite) {
      throw new Error(
        `Tiempo agotado esperando ${mensajes.join(' / ')}; el fichero tiene ${lineas.length} líneas`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, INTERVALO_ESPERA_MS));
    lineas = lineasDeRegistro();
  }
  return lineas;
}

describe('TC-019 Composición de dependencias reales (TASK-013)', () => {
  beforeAll(() => {
    mkdirSync(DIRECTORIO_TEMPORAL, { recursive: true });
  });

  afterAll(() => {
    try {
      rmSync(DIRECTORIO_TEMPORAL, { recursive: true, force: true });
    } catch {
      // El transporte de Pino mantiene el fichero abierto hasta cerrar el proceso.
    }
  });

  beforeEach(() => {
    escribirTokensFicticios();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('compone el caso de uso con los cuatro puertos reales y devuelve éxito con red simulada', async () => {
    const llamadas = instalarRedSimulada(reglasFlujoFeliz());
    const casoUso = componerCrearPlaylistVacia();
    expect(typeof casoUso).toBe('function');

    const resultado = await casoUso({
      nombre: NOMBRE_EXITO,
      descripcion: 'Carretera',
      visibilidad: 'privada',
      canalConfirmacion: async () => 'confirmada',
    });

    expect(resultado).toEqual({
      resultado: 'exito',
      nombreEfectivo: 'Viaje 2026',
      visibilidad: 'privada',
      descripcionEfectiva: 'Carretera',
      identificador: IDENTIFICADOR,
      enlace: ENLACE,
    });

    // Sesión real: `getStoredTokens`/`checkExistingSession` validan el testigo almacenado.
    const primera = llamadas[0];
    expect(primera?.url).toBe(URL_PERFIL);
    expect(primera?.cabeceras.Authorization).toBe(`Bearer ${TESTIGO_SESION}`);

    // Gateway real: crea en Spotify con el testigo de la sesión vigente.
    const creacion = llamadas.find((llamada) => llamada.metodo === 'POST');
    expect(creacion?.url).toBe('https://api.spotify.com/v1/me/playlists');
    expect(creacion?.cabeceras.Authorization).toBe(`Bearer ${TESTIGO_SESION}`);
  });

  it('escribe el registro en el fichero temporal sin tocar data/ del repositorio', async () => {
    instalarRedSimulada(reglasFlujoFeliz());
    const casoUso = componerCrearPlaylistVacia();

    await casoUso({
      nombre: NOMBRE_REGISTRO,
      visibilidad: 'publica',
      canalConfirmacion: async () => 'confirmada',
    });

    const lineas = await esperarMensajes(['Playlist creada con éxito']);

    const inicio = lineas.find(
      (linea) =>
        linea.msg === 'Inicio de creación de playlist vacía' && linea.nombre === NOMBRE_REGISTRO
    );
    expect(inicio).toMatchObject({ level: 30, visibilidad: 'publica' });

    const exito = lineas.find(
      (linea) => linea.msg === 'Playlist creada con éxito' && linea.nombre === NOMBRE_REGISTRO
    );
    expect(exito).toMatchObject({
      level: 30,
      visibilidad: 'publica',
      descripcionEfectiva: 'Playlist sin descripción',
      identificador: IDENTIFICADOR,
    });

    const contenido = leerRegistro();
    expect(contenido).not.toMatch(/bearer/i);
    expect(contenido).not.toMatch(/authorization/i);
    expect(contenido).not.toContain(TESTIGO_SESION);

    const logReal = existsSync(RUTA_LOG_REAL) ? readFileSync(RUTA_LOG_REAL, 'utf8') : '';
    expect(logReal).not.toContain(NOMBRE_REGISTRO);
    const tokensReal = existsSync(RUTA_TOKENS_REAL) ? readFileSync(RUTA_TOKENS_REAL, 'utf8') : '';
    expect(tokensReal).not.toContain(TESTIGO_SESION);
  });

  it('sin tokens almacenados devuelve sinSesion sin invocar la red (UC-001-E1)', async () => {
    rmSync(RUTA_TOKENS, { force: true });
    const llamadas = instalarRedSimulada(reglasFlujoFeliz());
    const casoUso = componerCrearPlaylistVacia();

    const resultado = await casoUso({
      nombre: 'Viaje 2026',
      visibilidad: 'privada',
      canalConfirmacion: async () => 'confirmada',
    });

    expect(resultado).toEqual({ resultado: 'sinSesion' });
    expect(llamadas).toHaveLength(0);
  });

  it('REQUIRED_SCOPES conserva los ámbitos de playlist sin cambio en la conexión (P-003)', () => {
    expect(REQUIRED_SCOPES).toContain('playlist-modify-public');
    expect(REQUIRED_SCOPES).toContain('playlist-modify-private');

    const fuenteTipos = leerFuente('src/business/auth/types.ts');
    expect(fuenteTipos).toContain("'playlist-modify-public'");
    expect(fuenteTipos).toContain("'playlist-modify-private'");

    // La composición no redefine ámbitos: reutiliza la conexión existente.
    expect(leerFuente('src/presentation/composicion-crear-playlist.ts')).not.toContain(
      'playlist-modify'
    );
  });

  it('revisa los imports de las tres capas sin dependencias invertidas (RNF-003)', () => {
    const composicion = leerFuente('src/presentation/composicion-crear-playlist.ts');

    // Presentation compone Business y Data, sin efectos directos ni reglas propias.
    expect(composicion).toMatch(/from '\.\.\/business\//);
    expect(composicion).toMatch(/from '\.\.\/data\//);
    expect(composicion).not.toMatch(/node:fs|\bfetch\s*\(|console\.|process\.|\bany\b/);
    expect(composicion).not.toMatch(/esLongitudValida|esDuplicadoPropio|withRetry|Retry-After/);

    // Business no importa Presentation, CLI, Data, Pino ni efectos directos.
    const patronesNegocio: readonly RegExp[] = [
      /from\s+['"][^'"]*presentation/i,
      /from\s+['"][^'"]*cli/i,
      /from\s+['"][^'"]*data\//i,
      /from\s+['"][^'"]*pino/i,
      /from\s+['"]node:fs/,
      /\bfetch\s*\(/,
      /\bprocess\./,
      /\bconsole\./,
      /\b(argv|readline)\b/,
      /\bany\b/,
    ];
    for (const ruta of MODULOS_NEGOCIO) {
      const fuente = leerFuente(ruta);
      for (const patron of patronesNegocio) {
        expect(fuente, `${ruta} no debe contener ${patron}`).not.toMatch(patron);
      }
    }

    // Data no importa Business ni Presentation y no compone mensajes de usuario.
    for (const ruta of MODULOS_DATOS) {
      const fuente = leerFuente(ruta);
      expect(fuente, `${ruta} no debe importar de Business`).not.toMatch(
        /from\s+['"][^'"]*business/i
      );
      expect(fuente, `${ruta} no debe importar de Presentation`).not.toMatch(
        /from\s+['"][^'"]*presentation/i
      );
      expect(fuente, `${ruta} no debe usar any ni console`).not.toMatch(/\bany\b|console\./);
    }
  });

  it('expone una única composición para el comando directo y la opción 4', () => {
    const modulos = readdirSync(join(RAIZ, 'src', 'presentation')).filter((nombre) =>
      nombre.endsWith('.ts')
    );
    const queConstruyenPuertos = modulos.filter((nombre) => {
      const fuente = leerFuente(`src/presentation/${nombre}`);
      return fuente.includes('playlistGateway:') && fuente.includes('registroTecnico:');
    });
    expect(queConstruyenPuertos).toEqual(['composicion-crear-playlist.ts']);

    // Los puntos de entrada no ensamblan dependencias ni Data: delegan en la composición.
    for (const ruta of ['src/cli.ts', 'src/cli-main.ts']) {
      const fuente = leerFuente(ruta);
      expect(fuente, `${ruta} no debe construir dependencias`).not.toContain(
        'DependenciasCreacion'
      );
      expect(fuente, `${ruta} no debe importar de Data`).not.toMatch(/from\s+['"][^'"]*data\//i);
    }
  });
});
